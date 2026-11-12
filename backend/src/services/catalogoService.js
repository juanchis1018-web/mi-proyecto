/** Gestión del catálogo: servicios y barberos (con los servicios que presta cada uno). */
import { Op } from "sequelize";
import { sequelize, Servicio, Barbero } from "../models/index.js";
import { ErrorHttp, noEncontrado } from "../utils/errores.js";

/* Servicios --------------------------------------------------------------- */
export const servicioPlano = (s) => ({
  id: s.id,
  nombre: s.nombre,
  categoria: s.categoria,
  duracionMin: s.duracionMin,
  precio: s.precio,
  descripcion: s.descripcion,
  activo: s.activo,
});

export async function listarServicios({ todos = false } = {}) {
  const servicios = await Servicio.findAll({ where: todos ? {} : { activo: true }, order: [["id", "ASC"]] });
  return servicios.map(servicioPlano);
}

export async function obtenerServicio(id) {
  const s = await Servicio.findByPk(id);
  if (!s) throw noEncontrado("El servicio");
  return s;
}

export async function crearServicio(datos) {
  return servicioPlano(await Servicio.create(datos));
}

export async function actualizarServicio(id, datos) {
  const s = await obtenerServicio(id);
  await s.update(datos);
  return servicioPlano(s);
}

/** Borrado lógico: el servicio queda inactivo y los turnos históricos lo conservan. */
export async function desactivarServicio(id) {
  const s = await obtenerServicio(id);
  await s.update({ activo: false });
  return servicioPlano(s);
}

/* Barberos ---------------------------------------------------------------- */
export const barberoPlano = (b) => ({
  id: b.id,
  nombre: b.nombre,
  especialidad: b.especialidad,
  experiencia: b.experiencia,
  almuerzoInicio: b.almuerzoInicio,
  almuerzoFin: b.almuerzoFin,
  activo: b.activo,
  usuarioId: b.usuarioId,
  servicios: (b.servicios || []).map((s) => s.id).sort((x, y) => x - y),
});

const incluirServicios = { model: Servicio, as: "servicios", attributes: ["id"], through: { attributes: [] } };

export async function listarBarberos({ todos = false } = {}) {
  const barberos = await Barbero.findAll({ where: todos ? {} : { activo: true }, include: [incluirServicios], order: [["id", "ASC"]] });
  return barberos.map(barberoPlano);
}

export async function obtenerBarbero(id, opciones = {}) {
  const b = await Barbero.findByPk(id, { include: [incluirServicios], ...opciones });
  if (!b) throw noEncontrado("El barbero");
  return b;
}

async function validarServiciosExisten(ids, transaction) {
  const unicos = [...new Set(ids.map(Number))];
  const encontrados = await Servicio.count({ where: { id: { [Op.in]: unicos } }, transaction });
  if (encontrados !== unicos.length) {
    throw new ErrorHttp(422, "Revisa los datos marcados.", [{ campo: "servicios", mensaje: "Uno o más servicios no existen." }]);
  }
  return unicos;
}

function validarAlmuerzo({ almuerzoInicio, almuerzoFin }) {
  if (almuerzoFin <= almuerzoInicio) {
    throw new ErrorHttp(422, "Revisa los datos marcados.", [{ campo: "almuerzoFin", mensaje: "Debe ser posterior al inicio del almuerzo." }]);
  }
}

export async function crearBarbero({ servicios, ...datos }) {
  validarAlmuerzo(datos);
  return sequelize.transaction(async (transaction) => {
    const ids = await validarServiciosExisten(servicios, transaction);
    const b = await Barbero.create(datos, { transaction });
    await b.setServicios(ids, { transaction });
    return barberoPlano(await obtenerBarbero(b.id, { transaction }));
  });
}

export async function actualizarBarbero(id, { servicios, ...datos }) {
  return sequelize.transaction(async (transaction) => {
    const b = await obtenerBarbero(id, { transaction });
    validarAlmuerzo({ almuerzoInicio: datos.almuerzoInicio ?? b.almuerzoInicio, almuerzoFin: datos.almuerzoFin ?? b.almuerzoFin });
    await b.update(datos, { transaction });
    if (servicios) await b.setServicios(await validarServiciosExisten(servicios, transaction), { transaction });
    return barberoPlano(await obtenerBarbero(id, { transaction }));
  });
}

export async function desactivarBarbero(id) {
  const b = await obtenerBarbero(id);
  await b.update({ activo: false });
  return barberoPlano(b);
}
