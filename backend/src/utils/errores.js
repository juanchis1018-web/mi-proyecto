/** Error con código HTTP que los servicios lanzan y el middleware traduce a JSON. */
export class ErrorHttp extends Error {
  constructor(status, mensaje, detalles = []) {
    super(mensaje);
    this.name = "ErrorHttp";
    this.status = status;
    this.detalles = detalles;
  }
}

export const noEncontrado = (que) => new ErrorHttp(404, `${que} no existe.`);
export const prohibido = () => new ErrorHttp(403, "No tienes permiso para hacer esto.");

/** Envuelve controladores asíncronos para enviar sus errores al middleware de errores. */
export const asincrono = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
