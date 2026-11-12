/** Manejo centralizado de errores: respuestas JSON uniformes y sin detalles internos. */
import { ErrorHttp } from "../utils/errores.js";
import { config } from "../config/index.js";

export function rutaNoEncontrada(req, _res, next) {
  next(new ErrorHttp(404, `La ruta ${req.method} ${req.originalUrl} no existe.`));
}

// eslint-disable-next-line no-unused-vars
export function manejarErrores(error, req, res, _next) {
  let status = error.status || 500;
  let mensaje = error.message;
  let detalles = error.detalles || [];

  if (error.type === "entity.parse.failed") {
    status = 400;
    mensaje = "El cuerpo de la petición no es un JSON válido.";
  } else if (error.type === "entity.too.large") {
    mensaje = "La petición es demasiado grande.";
  } else if (error.name === "SequelizeUniqueConstraintError") {
    status = 409;
    mensaje = "El registro ya existe.";
  } else if (error.name === "SequelizeValidationError") {
    status = 422;
    mensaje = "Revisa los datos marcados.";
    detalles = error.errors.map((e) => ({ campo: e.path, mensaje: e.message }));
  } else if (!(error instanceof ErrorHttp) && status >= 500) {
    // Errores inesperados: se registran en el servidor y el cliente recibe un mensaje genérico
    if (!config.esPrueba) console.error(error);
    mensaje = "Ocurrió un error inesperado. Intenta de nuevo.";
  }

  res.status(status).json({ error: { status, mensaje, detalles } });
}
