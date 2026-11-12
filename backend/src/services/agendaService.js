/**
 * AgendaService: disponibilidad, reservas y cambios de estado de los turnos.
 * Las reglas viven en shared/agenda.js; aquí se cargan los datos, se aplican
 * los permisos y se garantiza la consistencia con transacciones.
 */
import { Op } from "sequelize";
import { sequelize, Turno, Barbero, Servicio } from "../models/index.js";
import { ErrorHttp, noEncontrado, prohibido } from "../utils/errores.js";
import { barberoPlano, servicioPlano, obtenerBarbero, obtenerServicio, listarBarberos } from "./catalogoService.js";
import {
  franjasDisponibles,
  proximoLibre,
  validarReserva,
  sePuedeCancelar,
  puedeTransicionar,
  inicioDelDia,
  aISOFecha,
  desdeISOFecha,
  codigoTurno,
  ESTADOS_QUE_OCUPAN,
} from "../../../shared/agenda.js";
import { NEGOCIO, ROLES, ESTADOS } from "../../../shared/negocio.js";

const turnoPlano = (t) => ({
  id: t.id,
  codigo: codigoTurno(t.id, t.barbero?.nombre),
  clienteId: t.clienteId,
  nombreCliente: t.nombreCliente,
  celularCliente: t.celularCliente,
  barberoId: t.barberoId,
  servicioId: t.servicioId,
  inicio: new Date(t.inicio).toISOString(),
  fin: new Date(t.fin).toISOString(),
  estado: t.estado,
  precio: t.precio,
  nota: t.nota,
  origen: t.origen,
  barbero: t.barbero ? { id: t.barbero.id, nombre: t.barbero.nombre } : null,
  servicio: t.servicio ? { id: t.servicio.id, nombre: t.servicio.nombre, duracionMin: t.servicio.duracionMin } : null,
});

const incluirDetalle = [
  { model: Barbero, as: "barbero", attributes: ["id", "nombre"] },
  { model: Servicio, as: "servicio", attributes: ["id", "nombre", "duracionMin"] },
];

/** Turnos que ocupan la agenda de un barbero entre dos fechas. */
async function turnosOcupados(barberoId, desde, hasta, transaction) {
  const turnos = await Turno.findAll({
    where: { barberoId, estado: { [Op.in]: ESTADOS_QUE_OCUPAN }, inicio: { [Op.lt]: hasta }, fin: { [Op.gt]: desde } },
    attributes: ["barberoId", "inicio", "fin", "estado"],
    transaction,
  });
  return turnos.map((t) => ({ barberoId: t.barberoId, inicio: t.inicio, fin: t.fin, estado: t.estado }));
}

const sumarDias = (fecha, dias) => {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
};

/* Disponibilidad ----------------------------------------------------------- */
export async function disponibilidad(barberoId, { servicioId, desde, dias = 7 }) {
  const barbero = barberoPlano(await obtenerBarbero(barberoId));
  const servicio = servicioPlano(await obtenerServicio(servicioId));
  const inicio = desde ? desdeISOFecha(desde) : inicioDelDia(new Date());
  if (!inicio) throw new ErrorHttp(400, "La fecha debe tener el formato AAAA-MM-DD.");
  const cantidad = Math.min(Math.max(Number(dias) || 1, 1), NEGOCIO.diasReservables);
  const turnos = await turnosOcupados(barbero.id, inicio, sumarDias(inicio, cantidad));

  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = sumarDias(inicio, i);
    return { fecha: aISOFecha(fecha), franjas: franjasDisponibles({ barbero, servicio, fecha, turnos }) };
  });
}

export async function proximosLibres({ servicioId = 1 } = {}) {
  const servicio = servicioPlano(await obtenerServicio(servicioId));
  const barberos = await listarBarberos();
  const hoy = inicioDelDia(new Date());
  return Promise.all(
    barberos.map(async (barbero) => {
      const turnos = await turnosOcupados(barbero.id, hoy, sumarDias(hoy, 7));
      return { barbero: { id: barbero.id, nombre: barbero.nombre }, franja: proximoLibre({ barbero, servicio, turnos }) };
    })
  );
}

/* Consulta de turnos ------------------------------------------------------- */
async function barberoDelUsuario(usuario) {
  const b = await Barbero.findOne({ where: { usuarioId: usuario.id } });
  if (!b) throw prohibido();
  return b;
}

/** Cliente: sus turnos. Barbero: su agenda. Administrador: todos. */
export async function listarTurnos(usuario, { fecha, barberoId, estado } = {}) {
  const where = {};
  if (usuario.rol === ROLES.CLIENTE) where.clienteId = usuario.id;
  if (usuario.rol === ROLES.BARBERO) where.barberoId = (await barberoDelUsuario(usuario)).id;
  if (barberoId && usuario.rol === ROLES.ADMIN) where.barberoId = Number(barberoId);
  if (estado) where.estado = estado;
  if (fecha) {
    const dia = desdeISOFecha(fecha);
    if (!dia) throw new ErrorHttp(400, "La fecha debe tener el formato AAAA-MM-DD.");
    where.inicio = { [Op.gte]: dia, [Op.lt]: sumarDias(dia, 1) };
  }
  const turnos = await Turno.findAll({ where, include: incluirDetalle, order: [["inicio", "ASC"], ["barberoId", "ASC"]] });
  return turnos.map(turnoPlano);
}

/* Reserva -------------------------------------------------------------------- */

/**
 * Cola por barbero dentro del proceso: las reservas para un mismo barbero se
 * procesan una tras otra. SQLite no admite transacciones concurrentes en una
 * conexión; en PostgreSQL, además, el bloqueo de fila (FOR UPDATE) protege
 * cuando hay varias réplicas del servidor.
 */
const colas = new Map();
function enCola(clave, tarea) {
  const anterior = colas.get(clave) || Promise.resolve();
  const actual = anterior.catch(() => {}).then(tarea);
  colas.set(clave, actual);
  actual.finally(() => colas.get(clave) === actual && colas.delete(clave)).catch(() => {});
  return actual;
}

export async function reservar(usuario, datos) {
  const esCliente = usuario.rol === ROLES.CLIENTE;

  const turno = await enCola(Number(datos.barberoId), () => sequelize.transaction(async (transaction) => {
    // Bloquea la fila del barbero: dos reservas simultáneas para él se atienden en orden (PostgreSQL)
    const bloqueado = await Barbero.findByPk(datos.barberoId, { transaction, lock: transaction.LOCK.UPDATE });
    const barberoModelo = bloqueado ? await obtenerBarbero(bloqueado.id, { transaction }) : null;
    const servicioModelo = await Servicio.findByPk(datos.servicioId, { transaction });
    const barbero = barberoModelo ? barberoPlano(barberoModelo) : null;
    const servicio = servicioModelo ? servicioPlano(servicioModelo) : null;

    const inicio = new Date(datos.inicio);
    const turnos = barbero && !Number.isNaN(inicio.getTime()) ? await turnosOcupados(barbero.id, inicioDelDia(inicio), sumarDias(inicioDelDia(inicio), 1), transaction) : [];
    const resultado = validarReserva({ barbero, servicio, inicio, turnos });
    if (!resultado.ok) {
      const status = resultado.codigo === "FRANJA_OCUPADA" ? 409 : resultado.codigo.endsWith("INVALIDO") ? 404 : 400;
      throw new ErrorHttp(status, resultado.mensaje);
    }

    return Turno.create(
      {
        clienteId: esCliente ? usuario.id : null,
        nombreCliente: esCliente ? usuario.nombre : datos.nombreCliente,
        celularCliente: esCliente ? usuario.celular : datos.celularCliente || null,
        barberoId: barbero.id,
        servicioId: servicio.id,
        inicio,
        fin: new Date(resultado.fin),
        estado: ESTADOS.PENDIENTE,
        precio: servicio.precio,
        nota: datos.nota || "",
        origen: esCliente ? "WEB" : "MOSTRADOR",
      },
      { transaction }
    );
  }));

  return turnoPlano(await Turno.findByPk(turno.id, { include: incluirDetalle }));
}

/* Cambio de estado ----------------------------------------------------------- */
export async function cambiarEstado(usuario, id, nuevoEstado) {
  const turno = await Turno.findByPk(id, { include: incluirDetalle });
  if (!turno) throw noEncontrado("El turno");

  if (usuario.rol === ROLES.CLIENTE) {
    // Un cliente no puede saber si existe un turno ajeno: se responde 404
    if (turno.clienteId !== usuario.id) throw noEncontrado("El turno");
    if (nuevoEstado !== ESTADOS.CANCELADO) throw prohibido();
    if (!sePuedeCancelar(turno)) throw new ErrorHttp(400, `Solo puedes cancelar hasta ${NEGOCIO.horasMinimasCancelacion} horas antes del turno.`);
  }
  if (usuario.rol === ROLES.BARBERO && turno.barberoId !== (await barberoDelUsuario(usuario)).id) throw prohibido();

  if (!puedeTransicionar(turno.estado, nuevoEstado)) throw new ErrorHttp(400, "Ese cambio de estado no está permitido.");
  if ([ESTADOS.ATENDIDO, ESTADOS.NO_ASISTIO].includes(nuevoEstado) && new Date(turno.inicio) > new Date()) {
    throw new ErrorHttp(400, "Solo se puede marcar como atendido o no asistió cuando el turno ya empezó.");
  }

  await turno.update({ estado: nuevoEstado });
  return turnoPlano(turno);
}

