/**
 * Reglas de validación de entrada (express-validator).
 * Responden 422 con la lista de campos inválidos, en el mismo formato que
 * usa el frontend para marcar cada campo.
 */
import { body, param, query, validationResult } from "express-validator";
import { ErrorHttp } from "../utils/errores.js";
import { CATEGORIAS, ESTADOS } from "../../../shared/negocio.js";

export function validar(reglas) {
  return [
    ...reglas,
    (req, _res, next) => {
      const errores = validationResult(req);
      if (errores.isEmpty()) return next();
      const vistos = new Set();
      const detalles = errores
        .array()
        .filter((e) => !vistos.has(e.path) && vistos.add(e.path))
        .map((e) => ({ campo: e.path, mensaje: e.msg }));
      next(new ErrorHttp(422, "Revisa los datos marcados.", detalles));
    },
  ];
}

const NOMBRE = /^[\p{L} .'-]+$/u;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const soloDigitos = (v) => String(v ?? "").replace(/\D/g, "");

const nombre = (campo) =>
  body(campo).isString().withMessage("Escribe el nombre.").bail().trim().isLength({ min: 3, max: 60 }).withMessage("El nombre debe tener entre 3 y 60 caracteres.").bail().matches(NOMBRE).withMessage("Usa solo letras y espacios.");

const celular = (campo) =>
  body(campo).customSanitizer(soloDigitos).matches(/^3\d{9}$/).withMessage("Escribe un celular de 10 dígitos que empiece por 3.");

export const id = param("id").isInt({ min: 1 }).withMessage("El identificador no es válido.").toInt();

export const reglasRegistro = [
  nombre("nombre"),
  body("email").isString().trim().isEmail().withMessage("Escribe un correo válido.").bail().isLength({ max: 120 }).normalizeEmail({ gmail_remove_dots: false }),
  celular("celular"),
  body("password").isString().isLength({ min: 8, max: 72 }).withMessage("La contraseña debe tener entre 8 y 72 caracteres.").bail().matches(/[A-Za-z]/).withMessage("Combina letras y números.").bail().matches(/\d/).withMessage("Combina letras y números."),
];

export const reglasLogin = [
  body("email").isString().trim().isEmail().withMessage("Escribe un correo válido.").normalizeEmail({ gmail_remove_dots: false }),
  body("password").isString().notEmpty().withMessage("La contraseña es obligatoria."),
];

export const reglasServicio = (parcial = false) => {
  const opcional = (cadena) => (parcial ? cadena.optional() : cadena);
  return [
    opcional(body("nombre")).isString().trim().isLength({ min: 1, max: 60 }).withMessage("El nombre es obligatorio (máximo 60 caracteres)."),
    opcional(body("categoria")).isIn(CATEGORIAS.map((c) => c.id)).withMessage("Elige una categoría válida."),
    opcional(body("duracionMin")).isInt({ min: 30, max: 180 }).withMessage("La duración debe estar entre 30 y 180 minutos.").bail().custom((v) => Number(v) % 30 === 0).withMessage("La duración debe ser múltiplo de 30 minutos.").toInt(),
    opcional(body("precio")).isInt({ min: 1000, max: 1000000 }).withMessage("El precio debe estar entre 1.000 y 1.000.000.").toInt(),
    body("descripcion").optional().isString().trim().isLength({ max: 200 }).withMessage("Máximo 200 caracteres."),
    body("activo").optional().isBoolean().withMessage("El estado debe ser verdadero o falso.").toBoolean(),
  ];
};

export const reglasBarbero = (parcial = false) => {
  const opcional = (cadena) => (parcial ? cadena.optional() : cadena);
  return [
    parcial ? nombre("nombre").optional() : nombre("nombre"),
    opcional(body("especialidad")).isString().trim().isLength({ min: 1, max: 80 }).withMessage("La especialidad es obligatoria (máximo 80 caracteres)."),
    opcional(body("experiencia")).isInt({ min: 0, max: 60 }).withMessage("La experiencia debe estar entre 0 y 60 años.").toInt(),
    opcional(body("servicios")).isArray({ min: 1 }).withMessage("Elige al menos un servicio."),
    body("servicios.*").isInt({ min: 1 }).withMessage("Servicio no válido.").toInt(),
    opcional(body("almuerzoInicio")).matches(HORA).withMessage("Usa el formato HH:MM."),
    opcional(body("almuerzoFin")).matches(HORA).withMessage("Usa el formato HH:MM."),
    body("activo").optional().isBoolean().withMessage("El estado debe ser verdadero o falso.").toBoolean(),
  ];
};

export const reglasReserva = [
  body("barberoId").isInt({ min: 1 }).withMessage("Elige un barbero.").toInt(),
  body("servicioId").isInt({ min: 1 }).withMessage("Elige un servicio.").toInt(),
  body("inicio").isISO8601({ strict: true }).withMessage("La fecha y hora no son válidas."),
  body("nota").optional({ values: "null" }).isString().trim().isLength({ max: 140 }).withMessage("La nota admite máximo 140 caracteres."),
  // El administrador registra turnos de clientes del local: debe indicar su nombre
  body("nombreCliente")
    .if((_valor, { req }) => req.usuario && req.usuario.rol === "ADMIN")
    .isString().withMessage("Escribe el nombre del cliente.").bail()
    .trim().isLength({ min: 3, max: 60 }).withMessage("El nombre debe tener entre 3 y 60 caracteres.").bail()
    .matches(NOMBRE).withMessage("Usa solo letras y espacios."),
  body("celularCliente").optional({ values: "falsy" }).customSanitizer(soloDigitos).matches(/^3\d{9}$/).withMessage("Escribe un celular de 10 dígitos que empiece por 3."),
];

export const reglasEstado = [body("estado").isIn(Object.values(ESTADOS)).withMessage("Estado no válido.")];

export const reglasDisponibilidad = [
  id,
  query("servicioId").isInt({ min: 1 }).withMessage("Indica el servicio.").toInt(),
  query("desde").optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("Usa el formato AAAA-MM-DD."),
  query("dias").optional().isInt({ min: 1, max: 14 }).withMessage("Entre 1 y 14 días.").toInt(),
];

export const reglasFiltroTurnos = [
  query("fecha").optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("Usa el formato AAAA-MM-DD."),
  query("barberoId").optional().isInt({ min: 1 }).toInt(),
  query("estado").optional().isIn(Object.values(ESTADOS)).withMessage("Estado no válido."),
];

export const reglasFecha = [query("fecha").optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("Usa el formato AAAA-MM-DD.")];
