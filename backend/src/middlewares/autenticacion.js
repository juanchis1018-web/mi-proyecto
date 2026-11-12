/** Autenticación con JWT (cabecera Authorization: Bearer) y autorización por rol. */
import { verificarToken } from "../services/authService.js";
import { ErrorHttp, prohibido, asincrono } from "../utils/errores.js";

function extraerToken(req) {
  const cabecera = req.get("authorization") || "";
  const [tipo, token] = cabecera.split(" ");
  return tipo === "Bearer" && token ? token : null;
}

/** Exige un token válido y deja el usuario en req.usuario. */
export const autenticar = asincrono(async (req, _res, next) => {
  const token = extraerToken(req);
  if (!token) throw new ErrorHttp(401, "Ingresa para continuar.");
  req.usuario = await verificarToken(token);
  next();
});

/** Si llega un token válido, identifica al usuario; si no, continúa como visitante. */
export const autenticarOpcional = asincrono(async (req, _res, next) => {
  const token = extraerToken(req);
  if (token) {
    try {
      req.usuario = await verificarToken(token);
    } catch {
      req.usuario = null;
    }
  }
  next();
});

/** Restringe la ruta a ciertos roles. Debe ir después de autenticar. */
export const autorizar =
  (...roles) =>
  (req, _res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) return next(prohibido());
    next();
  };
