/**
 * Modo demostración: implementa la misma interfaz que la API REST, pero guarda
 * los datos en el navegador (localStorage). Permite usar el producto publicado
 * en GitHub Pages, donde no hay servidor, y probar la interfaz sin backend.
 *
 * Aplica las mismas reglas que el backend (shared/agenda.js) y los mismos
 * permisos por rol, para que el comportamiento sea idéntico.
 */
import { NEGOCIO, ROLES, ESTADOS } from "../../shared/negocio.js";
import {
  franjasDisponibles,
  proximoLibre,
  validarReserva,
  sePuedeCancelar,
  puedeTransicionar,
  desdeISOFecha,
  aISOFecha,
  inicioDelDia,
  codigoTurno,
} from "../../shared/agenda.js";
import { resumenDelDia } from "../../shared/reportes.js";
import { SERVICIOS, BARBEROS, CUENTAS_DEMO, generarTurnos } from "../../shared/datosIniciales.js";
import { ErrorApi, MENSAJES } from "./errores.js";
import * as sesion from "./sesion.js";
import * as validar from "../utils/validaciones.js";

const CLAVE = "corteya.demo.v2";
const LATENCIA_MS = 150;
let memoria = null;

/* Persistencia ----------------------------------------------------------- */
function datosIniciales() {
  const usuarios = [
    { id: 1, ...CUENTAS_DEMO.admin },
    { id: 2, ...CUENTAS_DEMO.cliente },
    ...BARBEROS.map((b, i) => ({ id: 3 + i, nombre: b.nombre, email: b.email, password: CUENTAS_DEMO.barberoPassword, rol: ROLES.BARBERO, celular: `31000000${i}0` })),
  ];
  const barberos = BARBEROS.map((b, i) => {
    const { email, ...resto } = b;
    return { ...resto, usuarioId: 3 + i };
  });
  const turnos = generarTurnos({ servicios: SERVICIOS, barberos }).map((t, i) => ({ id: i + 1, clienteId: null, celularCliente: null, nota: "", ...t }));
  return {
    creado: aISOFecha(new Date()),
    usuarios,
    servicios: SERVICIOS.map((s) => ({ ...s })),
    barberos,
    turnos,
    secuencia: { usuarios: usuarios.length, servicios: SERVICIOS.length, barberos: barberos.length, turnos: turnos.length },
  };
}

function cargar() {
  if (memoria) return memoria;
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    // Los datos simulados se regeneran cada día para que la agenda tenga sentido
    if (guardado && guardado.creado === aISOFecha(new Date())) memoria = guardado;
  } catch {
    /* datos dañados o almacenamiento bloqueado */
  }
  if (!memoria) {
    memoria = datosIniciales();
    persistir();
  }
  return memoria;
}

function persistir() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(memoria));
  } catch {
    /* se conserva en memoria */
  }
}

export function reiniciarDemo() {
  memoria = datosIniciales();
  persistir();
}

const esperar = () => new Promise((r) => setTimeout(r, LATENCIA_MS));
const siguienteId = (tabla) => ++cargar().secuencia[tabla];
const copiar = (obj) => JSON.parse(JSON.stringify(obj));

/* Autenticación y permisos ----------------------------------------------- */
function usuarioActual() {
  const token = sesion.token();
  if (!token || !token.startsWith("demo.")) return null;
  return cargar().usuarios.find((u) => u.id === Number(token.slice(5))) || null;
}

function exigir(...roles) {
  const u = usuarioActual();
  if (!u) throw new ErrorApi(401, MENSAJES.SESION);
  if (roles.length && !roles.includes(u.rol)) throw new ErrorApi(403, MENSAJES.PERMISO);
  return u;
}

const publico = (u) => ({ id: u.id, nombre: u.nombre, email: u.email, celular: u.celular, rol: u.rol, barberoId: barberoDeUsuario(u)?.id ?? null });
const barberoDeUsuario = (u) => cargar().barberos.find((b) => b.usuarioId === u.id) || null;

function errorValidacion(detalles) {
  const lista = detalles.filter((d) => d.mensaje);
  if (lista.length) throw new ErrorApi(422, "Revisa los datos marcados.", lista);
}

/* Detalle de turnos ------------------------------------------------------ */
function conDetalle(t) {
  const db = cargar();
  const barbero = db.barberos.find((b) => b.id === t.barberoId);
  const servicio = db.servicios.find((s) => s.id === t.servicioId);
  return {
    ...copiar(t),
    codigo: codigoTurno(t.id, barbero?.nombre),
    barbero: barbero ? { id: barbero.id, nombre: barbero.nombre } : null,
    servicio: servicio ? { id: servicio.id, nombre: servicio.nombre, duracionMin: servicio.duracionMin } : null,
  };
}

/* Interfaz pública (misma forma que services/api.js) --------------------- */
export const modo = "demo";

export async function salud() {
  return { estado: "ok", modo };
}

export const auth = {
  async login({ email, password }) {
    await esperar();
    const u = cargar().usuarios.find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!u || u.password !== password) throw new ErrorApi(401, "Correo o contraseña incorrectos.");
    return { token: `demo.${u.id}`, usuario: publico(u) };
  },

  async registro(datos) {
    await esperar();
    errorValidacion([
      { campo: "nombre", mensaje: validar.nombre(datos.nombre) },
      { campo: "email", mensaje: validar.email(datos.email) },
      { campo: "celular", mensaje: validar.celular(datos.celular) },
      { campo: "password", mensaje: validar.password(datos.password) },
    ]);
    const db = cargar();
    const email = datos.email.trim().toLowerCase();
    if (db.usuarios.some((u) => u.email.toLowerCase() === email)) {
      throw new ErrorApi(409, "Ya existe una cuenta con ese correo.", [{ campo: "email", mensaje: "Ya existe una cuenta con ese correo." }]);
    }
    const u = { id: siguienteId("usuarios"), nombre: datos.nombre.trim(), email, celular: validar.soloDigitos(datos.celular), password: datos.password, rol: ROLES.CLIENTE };
    db.usuarios.push(u);
    persistir();
    return { token: `demo.${u.id}`, usuario: publico(u) };
  },

  async yo() {
    return publico(exigir());
  },
};

function validarServicio(d) {
  errorValidacion([
    { campo: "nombre", mensaje: validar.requerido(d.nombre, "El nombre") || (String(d.nombre).trim().length > 60 ? "Máximo 60 caracteres." : "") },
    { campo: "categoria", mensaje: ["corte", "barba", "combo"].includes(d.categoria) ? "" : "Elige una categoría." },
    { campo: "duracionMin", mensaje: validar.duracionServicio(d.duracionMin) },
    { campo: "precio", mensaje: validar.entero(d.precio, { min: 1000, max: 1000000, etiqueta: "El precio" }) },
  ]);
}

export const servicios = {
  async listar({ todos = false } = {}) {
    await esperar();
    return copiar(cargar().servicios.filter((s) => todos || s.activo));
  },
  async crear(d) {
    exigir(ROLES.ADMIN);
    await esperar();
    validarServicio(d);
    const s = { id: siguienteId("servicios"), nombre: d.nombre.trim(), categoria: d.categoria, duracionMin: Number(d.duracionMin), precio: Number(d.precio), descripcion: (d.descripcion || "").trim(), activo: d.activo !== false };
    cargar().servicios.push(s);
    persistir();
    return copiar(s);
  },
  async actualizar(id, d) {
    exigir(ROLES.ADMIN);
    await esperar();
    const s = cargar().servicios.find((x) => x.id === Number(id));
    if (!s) throw new ErrorApi(404, "El servicio no existe.");
    validarServicio({ ...s, ...d });
    Object.assign(s, {
      nombre: (d.nombre ?? s.nombre).trim(),
      categoria: d.categoria ?? s.categoria,
      duracionMin: Number(d.duracionMin ?? s.duracionMin),
      precio: Number(d.precio ?? s.precio),
      descripcion: (d.descripcion ?? s.descripcion).trim(),
      activo: d.activo ?? s.activo,
    });
    persistir();
    return copiar(s);
  },
  async eliminar(id) {
    exigir(ROLES.ADMIN);
    await esperar();
    const s = cargar().servicios.find((x) => x.id === Number(id));
    if (!s) throw new ErrorApi(404, "El servicio no existe.");
    s.activo = false; // borrado lógico: los turnos históricos conservan su servicio
    persistir();
    return copiar(s);
  },
};

function validarBarbero(d) {
  const servicios = (d.servicios || []).map(Number);
  errorValidacion([
    { campo: "nombre", mensaje: validar.nombre(d.nombre) },
    { campo: "especialidad", mensaje: validar.requerido(d.especialidad, "La especialidad") },
    { campo: "experiencia", mensaje: validar.entero(d.experiencia, { min: 0, max: 60, etiqueta: "La experiencia" }) },
    { campo: "servicios", mensaje: servicios.length ? "" : "Elige al menos un servicio." },
    { campo: "almuerzoInicio", mensaje: validar.hora(d.almuerzoInicio) },
    { campo: "almuerzoFin", mensaje: validar.hora(d.almuerzoFin) || (d.almuerzoFin <= d.almuerzoInicio ? "Debe ser posterior al inicio." : "") },
  ]);
}

export const barberos = {
  async listar({ todos = false } = {}) {
    await esperar();
    return copiar(cargar().barberos.filter((b) => todos || b.activo));
  },
  async crear(d) {
    exigir(ROLES.ADMIN);
    await esperar();
    validarBarbero(d);
    const b = {
      id: siguienteId("barberos"),
      nombre: d.nombre.trim(),
      especialidad: d.especialidad.trim(),
      experiencia: Number(d.experiencia),
      servicios: d.servicios.map(Number),
      almuerzoInicio: d.almuerzoInicio,
      almuerzoFin: d.almuerzoFin,
      activo: d.activo !== false,
      usuarioId: null,
    };
    cargar().barberos.push(b);
    persistir();
    return copiar(b);
  },
  async actualizar(id, d) {
    exigir(ROLES.ADMIN);
    await esperar();
    const b = cargar().barberos.find((x) => x.id === Number(id));
    if (!b) throw new ErrorApi(404, "El barbero no existe.");
    const nuevo = { ...b, ...d, servicios: (d.servicios ?? b.servicios).map(Number) };
    validarBarbero(nuevo);
    Object.assign(b, {
      nombre: nuevo.nombre.trim(),
      especialidad: nuevo.especialidad.trim(),
      experiencia: Number(nuevo.experiencia),
      servicios: nuevo.servicios,
      almuerzoInicio: nuevo.almuerzoInicio,
      almuerzoFin: nuevo.almuerzoFin,
      activo: nuevo.activo,
    });
    persistir();
    return copiar(b);
  },
  async eliminar(id) {
    exigir(ROLES.ADMIN);
    await esperar();
    const b = cargar().barberos.find((x) => x.id === Number(id));
    if (!b) throw new ErrorApi(404, "El barbero no existe.");
    b.activo = false;
    persistir();
    return copiar(b);
  },

  async disponibilidad(barberoId, { servicioId, desde, dias = 7 }) {
    await esperar();
    const db = cargar();
    const barbero = db.barberos.find((b) => b.id === Number(barberoId));
    const servicio = db.servicios.find((s) => s.id === Number(servicioId));
    if (!barbero) throw new ErrorApi(404, "El barbero no existe.");
    if (!servicio) throw new ErrorApi(404, "El servicio no existe.");
    const inicio = desdeISOFecha(desde) || inicioDelDia(new Date());
    return Array.from({ length: Math.min(Number(dias) || 1, NEGOCIO.diasReservables) }, (_, i) => {
      const fecha = new Date(inicio);
      fecha.setDate(inicio.getDate() + i);
      return { fecha: aISOFecha(fecha), franjas: franjasDisponibles({ barbero, servicio, fecha, turnos: db.turnos }) };
    });
  },

  async proximosLibres({ servicioId = 1 } = {}) {
    await esperar();
    const db = cargar();
    const servicio = db.servicios.find((s) => s.id === Number(servicioId)) || db.servicios[0];
    return db.barberos
      .filter((b) => b.activo)
      .map((b) => ({ barbero: { id: b.id, nombre: b.nombre }, franja: proximoLibre({ barbero: b, servicio, turnos: db.turnos }) }));
  },
};

export const turnos = {
  /** Cliente: sus turnos. Barbero: su agenda. Administrador: todos. */
  async listar({ fecha, barberoId, estado } = {}) {
    const u = exigir();
    await esperar();
    const db = cargar();
    let lista = db.turnos;
    if (u.rol === ROLES.CLIENTE) lista = lista.filter((t) => t.clienteId === u.id);
    if (u.rol === ROLES.BARBERO) lista = lista.filter((t) => t.barberoId === barberoDeUsuario(u)?.id);
    if (fecha) {
      const dia = desdeISOFecha(fecha);
      lista = lista.filter((t) => dia && inicioDelDia(t.inicio).getTime() === dia.getTime());
    }
    if (barberoId) lista = lista.filter((t) => t.barberoId === Number(barberoId));
    if (estado) lista = lista.filter((t) => t.estado === estado);
    return lista.slice().sort((a, b) => new Date(a.inicio) - new Date(b.inicio)).map(conDetalle);
  },

  async reservar(d) {
    const u = exigir(ROLES.CLIENTE, ROLES.ADMIN);
    await esperar();
    const db = cargar();
    const barbero = db.barberos.find((b) => b.id === Number(d.barberoId));
    const servicio = db.servicios.find((s) => s.id === Number(d.servicioId));
    if (u.rol === ROLES.ADMIN) {
      errorValidacion([
        { campo: "nombreCliente", mensaje: validar.nombre(d.nombreCliente) },
        { campo: "celularCliente", mensaje: d.celularCliente ? validar.celular(d.celularCliente) : "" },
      ]);
    }
    if (d.nota && String(d.nota).length > 140) errorValidacion([{ campo: "nota", mensaje: "La nota admite máximo 140 caracteres." }]);

    const resultado = validarReserva({ barbero, servicio, inicio: d.inicio, turnos: db.turnos });
    if (!resultado.ok) throw new ErrorApi(resultado.codigo === "FRANJA_OCUPADA" ? 409 : 400, resultado.mensaje);

    const turno = {
      id: siguienteId("turnos"),
      clienteId: u.rol === ROLES.CLIENTE ? u.id : null,
      nombreCliente: u.rol === ROLES.CLIENTE ? u.nombre : d.nombreCliente.trim(),
      celularCliente: u.rol === ROLES.CLIENTE ? u.celular : validar.soloDigitos(d.celularCliente) || null,
      barberoId: barbero.id,
      servicioId: servicio.id,
      inicio: new Date(d.inicio).toISOString(),
      fin: resultado.fin,
      estado: ESTADOS.PENDIENTE,
      precio: servicio.precio,
      nota: (d.nota || "").trim(),
      origen: u.rol === ROLES.CLIENTE ? "WEB" : "MOSTRADOR",
    };
    db.turnos.push(turno);
    persistir();
    return conDetalle(turno);
  },

  async cambiarEstado(id, estado) {
    const u = exigir();
    await esperar();
    const t = cargar().turnos.find((x) => x.id === Number(id));
    if (!t) throw new ErrorApi(404, "El turno no existe.");

    if (u.rol === ROLES.CLIENTE) {
      if (t.clienteId !== u.id) throw new ErrorApi(404, "El turno no existe.");
      if (estado !== ESTADOS.CANCELADO) throw new ErrorApi(403, MENSAJES.PERMISO);
      if (!sePuedeCancelar(t)) throw new ErrorApi(400, `Solo puedes cancelar hasta ${NEGOCIO.horasMinimasCancelacion} horas antes del turno.`);
    }
    if (u.rol === ROLES.BARBERO && t.barberoId !== barberoDeUsuario(u)?.id) throw new ErrorApi(403, MENSAJES.PERMISO);
    if (!puedeTransicionar(t.estado, estado)) throw new ErrorApi(400, "Ese cambio de estado no está permitido.");
    if ([ESTADOS.ATENDIDO, ESTADOS.NO_ASISTIO].includes(estado) && new Date(t.inicio) > new Date()) {
      throw new ErrorApi(400, "Solo se puede marcar como atendido o no asistió cuando el turno ya empezó.");
    }
    t.estado = estado;
    persistir();
    return conDetalle(t);
  },
};

export const reportes = {
  async resumen({ fecha } = {}) {
    exigir(ROLES.ADMIN);
    await esperar();
    const db = cargar();
    return resumenDelDia({ fecha: desdeISOFecha(fecha) || new Date(), turnos: db.turnos, barberos: db.barberos });
  },
};
