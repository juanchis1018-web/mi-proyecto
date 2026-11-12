/** Error uniforme para la capa de datos (API real o modo demostración). */
export class ErrorApi extends Error {
  constructor(status, mensaje, detalles = []) {
    super(mensaje);
    this.name = "ErrorApi";
    this.status = status;
    this.mensaje = mensaje;
    this.detalles = detalles;
  }
}

export const MENSAJES = Object.freeze({
  RED: "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.",
  SESION: "Tu sesión terminó. Ingresa de nuevo.",
  PERMISO: "No tienes permiso para hacer esto.",
});
