/**
 * Estado de la sesión del usuario (token y datos básicos).
 * Se guarda en localStorage para mantener la sesión al recargar y notifica
 * a los suscriptores (encabezado, router) cuando cambia.
 */
const CLAVE = "corteya.sesion";
const suscriptores = new Set();
let sesion = leer();

function leer() {
  try {
    const valor = localStorage.getItem(CLAVE);
    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
}

function guardar() {
  try {
    if (sesion) localStorage.setItem(CLAVE, JSON.stringify(sesion));
    else localStorage.removeItem(CLAVE);
  } catch {
    /* sin almacenamiento: la sesión dura mientras la pestaña esté abierta */
  }
}

export function obtener() {
  return sesion;
}

export function usuario() {
  return sesion ? sesion.usuario : null;
}

export function token() {
  return sesion ? sesion.token : null;
}

export function tieneRol(...roles) {
  return !!sesion && roles.includes(sesion.usuario.rol);
}

export function iniciar(nuevaSesion) {
  sesion = { token: nuevaSesion.token, usuario: nuevaSesion.usuario };
  guardar();
  suscriptores.forEach((fn) => fn(sesion));
}

export function cerrar() {
  sesion = null;
  guardar();
  suscriptores.forEach((fn) => fn(null));
}

export function alCambiar(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}
