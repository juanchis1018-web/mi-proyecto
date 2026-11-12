/**
 * Validaciones de formularios del lado del cliente.
 * Cada función devuelve un mensaje de error o "" si el valor es válido.
 * El backend repite estas validaciones: el frontend nunca es la única defensa.
 */

export function nombre(valor) {
  const v = String(valor || "").trim();
  if (v.length < 3) return "Escribe el nombre (mínimo 3 letras).";
  if (v.length > 60) return "El nombre admite máximo 60 caracteres.";
  if (!/^[\p{L} .'-]+$/u.test(v)) return "Usa solo letras y espacios.";
  return "";
}

export function email(valor) {
  const v = String(valor || "").trim();
  if (!v) return "Escribe tu correo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Escribe un correo válido, por ejemplo nombre@correo.com.";
  return "";
}

/** Celular colombiano: 10 dígitos que empiezan por 3 (se ignoran espacios y guiones). */
export function celular(valor) {
  const digitos = String(valor || "").replace(/\D/g, "");
  if (!/^3\d{9}$/.test(digitos)) return "Escribe un celular de 10 dígitos que empiece por 3.";
  return "";
}

export function password(valor) {
  const v = String(valor || "");
  if (v.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return "Combina letras y números.";
  return "";
}

export function requerido(valor, etiqueta = "Este campo") {
  return String(valor ?? "").trim() ? "" : `${etiqueta} es obligatorio.`;
}

export function entero(valor, { min, max, etiqueta = "El valor" } = {}) {
  const n = Number(valor);
  if (String(valor).trim() === "" || !Number.isInteger(n)) return `${etiqueta} debe ser un número entero.`;
  if (min !== undefined && n < min) return `${etiqueta} debe ser mínimo ${min}.`;
  if (max !== undefined && n > max) return `${etiqueta} debe ser máximo ${max}.`;
  return "";
}

/** Duración en múltiplos de 30 minutos, entre 30 y 180. */
export function duracionServicio(valor) {
  const error = entero(valor, { min: 30, max: 180, etiqueta: "La duración" });
  if (error) return error;
  return Number(valor) % 30 === 0 ? "" : "La duración debe ser múltiplo de 30 minutos.";
}

export function hora(valor) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(valor || "")) ? "" : "Usa el formato HH:MM.";
}

export const soloDigitos = (valor) => String(valor || "").replace(/\D/g, "");
