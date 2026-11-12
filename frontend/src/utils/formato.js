/** Formatos de moneda, fecha y hora para Colombia. */
import { inicioDelDia } from "../../shared/agenda.js";

const fmtPesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const fmtHora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });
const fmtDiaCorto = new Intl.DateTimeFormat("es-CO", { weekday: "short" });
const fmtFechaLarga = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" });
const fmtFechaCorta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });

const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const limpiarEspacios = (t) => t.replace(/[  ]/g, " ");

export const pesos = (valor) => limpiarEspacios(fmtPesos.format(Number(valor) || 0));
export const hora = (fecha) => limpiarEspacios(fmtHora.format(new Date(fecha)));
export const horaSinSufijo = (fecha) => hora(fecha).replace(/\s?[ap]\.\s?m\./, "");
export const diaCorto = (fecha) => capitalizar(fmtDiaCorto.format(new Date(fecha)).replace(".", ""));
export const fechaLarga = (fecha) => capitalizar(fmtFechaLarga.format(new Date(fecha)));
export const fechaCorta = (fecha) => limpiarEspacios(fmtFechaCorta.format(new Date(fecha))).replace(".", "");

/** "Hoy", "Mañana" o el día de la semana. */
export function diaRelativo(fecha, ahora = new Date()) {
  const diferencia = Math.round((inicioDelDia(fecha) - inicioDelDia(ahora)) / 86400000);
  if (diferencia === 0) return "Hoy";
  if (diferencia === 1) return "Mañana";
  if (diferencia === -1) return "Ayer";
  return capitalizar(fmtFechaLarga.format(new Date(fecha)).split(",")[0]);
}

export function duracion(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
}

export function porcentaje(fraccion) {
  return `${Math.round((Number(fraccion) || 0) * 100)} %`;
}

export const ETIQUETAS_ESTADO = Object.freeze({
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  ATENDIDO: "Atendido",
  NO_ASISTIO: "No asistió",
  CANCELADO: "Cancelado",
});

export const ETIQUETAS_ROL = Object.freeze({ CLIENTE: "Cliente", BARBERO: "Barbero", ADMIN: "Administrador" });

export function iniciales(nombre) {
  return String(nombre)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
