/**
 * Reglas de negocio de la agenda (funciones puras, sin DOM ni base de datos).
 * Las usan el frontend (cálculo de franjas en modo demostración) y el backend
 * (AgendaService), de modo que la regla de no solapamiento vive en un solo lugar.
 */
import { NEGOCIO, ESTADOS } from "./negocio.js";

/** Estados que ocupan tiempo en la agenda del barbero. */
export const ESTADOS_QUE_OCUPAN = [ESTADOS.PENDIENTE, ESTADOS.CONFIRMADO, ESTADOS.ATENDIDO, ESTADOS.NO_ASISTIO];

/** Transiciones de estado permitidas (máquina de estados del turno). */
export const TRANSICIONES = Object.freeze({
  PENDIENTE: ["CONFIRMADO", "CANCELADO"],
  CONFIRMADO: ["ATENDIDO", "NO_ASISTIO", "CANCELADO"],
  ATENDIDO: [],
  NO_ASISTIO: [],
  CANCELADO: [],
});

export function puedeTransicionar(desde, hacia) {
  return (TRANSICIONES[desde] || []).includes(hacia);
}

export function inicioDelDia(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Combina una fecha con una hora "HH:MM". */
export function combinar(fecha, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(fecha);
  d.setHours(h, m, 0, 0);
  return d;
}

export function sumarMinutos(fecha, minutos) {
  return new Date(new Date(fecha).getTime() + minutos * 60000);
}

/** "2026-11-12" → Date local a medianoche. */
export function desdeISOFecha(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(texto))) return null;
  const [a, m, d] = texto.split("-").map(Number);
  const fecha = new Date(a, m - 1, d);
  return fecha.getFullYear() === a && fecha.getMonth() === m - 1 && fecha.getDate() === d ? fecha : null;
}

/** Date → "2026-11-12" en hora local. */
export function aISOFecha(fecha) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** [aIni, aFin) y [bIni, bFin) se solapan si cada uno empieza antes de que termine el otro. */
export function seSolapan(aIni, aFin, bIni, bFin) {
  return new Date(aIni) < new Date(bFin) && new Date(bIni) < new Date(aFin);
}

export function cruzaAlmuerzo(barbero, inicio, fin) {
  if (!barbero.almuerzoInicio || !barbero.almuerzoFin) return false;
  return seSolapan(inicio, fin, combinar(inicio, barbero.almuerzoInicio), combinar(inicio, barbero.almuerzoFin));
}

export function esDiaHabil(fecha, negocio = NEGOCIO) {
  return negocio.diasAtencion.includes(new Date(fecha).getDay());
}

function mismoDia(a, b) {
  return inicioDelDia(a).getTime() === inicioDelDia(b).getTime();
}

export function turnosQueOcupan(turnos, barberoId, fecha) {
  return turnos.filter(
    (t) => Number(t.barberoId) === Number(barberoId) && ESTADOS_QUE_OCUPAN.includes(t.estado) && mismoDia(t.inicio, fecha)
  );
}

/**
 * Franjas en que el barbero puede atender un servicio en una fecha.
 * Válida si: día hábil, barbero activo que presta el servicio, cabe antes del
 * cierre, no cruza el almuerzo, no se solapa con un turno activo y no ha pasado.
 */
export function franjasDisponibles({ barbero, servicio, fecha, turnos, ahora = new Date(), negocio = NEGOCIO }) {
  if (!barbero || !servicio || !barbero.activo || !servicio.activo) return [];
  if (!esDiaHabil(fecha, negocio)) return [];
  if (!(barbero.servicios || []).map(Number).includes(Number(servicio.id))) return [];

  const apertura = combinar(fecha, negocio.apertura);
  const cierre = combinar(fecha, negocio.cierre);
  const ocupados = turnosQueOcupan(turnos, barbero.id, fecha);
  const franjas = [];

  for (let ini = apertura; sumarMinutos(ini, servicio.duracionMin) <= cierre; ini = sumarMinutos(ini, negocio.intervaloMin)) {
    const fin = sumarMinutos(ini, servicio.duracionMin);
    if (ini <= ahora) continue;
    if (cruzaAlmuerzo(barbero, ini, fin)) continue;
    if (ocupados.some((t) => seSolapan(ini, fin, t.inicio, t.fin))) continue;
    franjas.push({ inicio: ini.toISOString(), fin: fin.toISOString() });
  }
  return franjas;
}

/** Primer espacio libre del barbero en los próximos días. */
export function proximoLibre({ barbero, servicio, turnos, dias = 7, ahora = new Date(), negocio = NEGOCIO }) {
  for (let d = 0; d < dias; d++) {
    const fecha = inicioDelDia(ahora);
    fecha.setDate(fecha.getDate() + d);
    const franjas = franjasDisponibles({ barbero, servicio, fecha, turnos, ahora, negocio });
    if (franjas.length) return franjas[0];
  }
  return null;
}

/**
 * Valida una reserva completa. Devuelve { ok, fin } o { ok: false, codigo, mensaje }.
 * El backend traduce los códigos a respuestas HTTP (400, 409).
 */
export function validarReserva({ barbero, servicio, inicio, turnos, ahora = new Date(), negocio = NEGOCIO }) {
  if (!barbero || !barbero.activo) return { ok: false, codigo: "BARBERO_INVALIDO", mensaje: "El barbero no existe o no está activo." };
  if (!servicio || !servicio.activo) return { ok: false, codigo: "SERVICIO_INVALIDO", mensaje: "El servicio no existe o no está activo." };
  if (!(barbero.servicios || []).map(Number).includes(Number(servicio.id))) {
    return { ok: false, codigo: "SERVICIO_NO_PRESTADO", mensaje: `${barbero.nombre} no presta el servicio ${servicio.nombre}.` };
  }
  const ini = new Date(inicio);
  if (Number.isNaN(ini.getTime())) return { ok: false, codigo: "FECHA_INVALIDA", mensaje: "La fecha y hora no son válidas." };

  const limite = inicioDelDia(ahora);
  limite.setDate(limite.getDate() + negocio.diasReservables);
  if (ini <= ahora) return { ok: false, codigo: "FECHA_PASADA", mensaje: "No se puede reservar en una hora que ya pasó." };
  if (ini >= limite) return { ok: false, codigo: "FECHA_LEJANA", mensaje: `Solo se puede reservar con ${negocio.diasReservables} días de anticipación.` };

  const libres = franjasDisponibles({ barbero, servicio, fecha: ini, turnos, ahora, negocio });
  if (!libres.some((f) => new Date(f.inicio).getTime() === ini.getTime())) {
    return { ok: false, codigo: "FRANJA_OCUPADA", mensaje: "Esa hora ya no está disponible. Elige otra franja." };
  }
  return { ok: true, fin: sumarMinutos(ini, servicio.duracionMin).toISOString() };
}

/** Un turno se puede cancelar si está pendiente o confirmado y faltan al menos N horas. */
export function sePuedeCancelar(turno, ahora = new Date(), negocio = NEGOCIO) {
  const horas = (new Date(turno.inicio) - ahora) / 3600000;
  return [ESTADOS.PENDIENTE, ESTADOS.CONFIRMADO].includes(turno.estado) && horas >= negocio.horasMinimasCancelacion;
}

/** Fracción del tiempo laborable del barbero (sin almuerzo) reservada en el día. */
export function ocupacion({ barbero, fecha, turnos, negocio = NEGOCIO }) {
  if (!esDiaHabil(fecha, negocio)) return 0;
  let laborables = (combinar(fecha, negocio.cierre) - combinar(fecha, negocio.apertura)) / 60000;
  if (barbero.almuerzoInicio && barbero.almuerzoFin) {
    laborables -= (combinar(fecha, barbero.almuerzoFin) - combinar(fecha, barbero.almuerzoInicio)) / 60000;
  }
  const reservados = turnosQueOcupan(turnos, barbero.id, fecha).reduce((s, t) => s + (new Date(t.fin) - new Date(t.inicio)) / 60000, 0);
  return laborables > 0 ? Math.min(1, reservados / laborables) : 0;
}

/** Código corto del turno que ve el cliente, por ejemplo "A-042". */
export function codigoTurno(id, nombreBarbero = "") {
  const inicial = (String(nombreBarbero).trim().charAt(0) || "T").toUpperCase();
  return `${inicial}-${String(id).padStart(3, "0").slice(-3)}`;
}
