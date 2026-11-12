/** Registro, inicio de sesión y emisión/verificación de tokens JWT. */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Usuario, Barbero } from "../models/index.js";
import { config } from "../config/index.js";
import { ErrorHttp } from "../utils/errores.js";
import { ROLES } from "../../../shared/negocio.js";

const RONDAS_BCRYPT = config.esPrueba ? 4 : 10;

export const cifrarPassword = (password) => bcrypt.hash(password, RONDAS_BCRYPT);

/** Datos públicos del usuario: nunca se expone el hash de la contraseña. */
export async function usuarioPublico(usuario) {
  const barbero = usuario.rol === ROLES.BARBERO ? await Barbero.findOne({ where: { usuarioId: usuario.id } }) : null;
  return { id: usuario.id, nombre: usuario.nombre, email: usuario.email, celular: usuario.celular, rol: usuario.rol, barberoId: barbero ? barbero.id : null };
}

function emitirToken(usuario) {
  return jwt.sign({ sub: String(usuario.id), rol: usuario.rol }, config.jwt.secreto, { expiresIn: config.jwt.expira, algorithm: "HS256" });
}

export async function registrar({ nombre, email, celular, password }) {
  const existente = await Usuario.findOne({ where: { email: email.toLowerCase() } });
  if (existente) throw new ErrorHttp(409, "Ya existe una cuenta con ese correo.", [{ campo: "email", mensaje: "Ya existe una cuenta con ese correo." }]);
  const usuario = await Usuario.create({ nombre, email: email.toLowerCase(), celular, passwordHash: await cifrarPassword(password), rol: ROLES.CLIENTE });
  return { token: emitirToken(usuario), usuario: await usuarioPublico(usuario) };
}

export async function iniciarSesion({ email, password }) {
  const usuario = await Usuario.findOne({ where: { email: email.toLowerCase() } });
  // Se compara siempre contra un hash para no revelar, por el tiempo de respuesta, si el correo existe
  const hash = usuario ? usuario.passwordHash : "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.0QZb5uE1R8m3v0yYb7vH9Yy0Yb7a";
  const valido = await bcrypt.compare(password, hash);
  if (!usuario || !valido || !usuario.activo) throw new ErrorHttp(401, "Correo o contraseña incorrectos.");
  return { token: emitirToken(usuario), usuario: await usuarioPublico(usuario) };
}

/** Verifica el token y devuelve el usuario activo, o lanza 401. */
export async function verificarToken(token) {
  let datos;
  try {
    datos = jwt.verify(token, config.jwt.secreto, { algorithms: ["HS256"] });
  } catch {
    throw new ErrorHttp(401, "Tu sesión terminó. Ingresa de nuevo.");
  }
  const usuario = await Usuario.findByPk(Number(datos.sub));
  if (!usuario || !usuario.activo) throw new ErrorHttp(401, "Tu sesión terminó. Ingresa de nuevo.");
  return usuario;
}
