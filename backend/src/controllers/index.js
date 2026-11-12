/**
 * Controladores: traducen la petición HTTP a una llamada de servicio y
 * devuelven la respuesta con el código de estado adecuado.
 */
import * as auth from "../services/authService.js";
import * as catalogo from "../services/catalogoService.js";
import * as agenda from "../services/agendaService.js";
import * as reportes from "../services/reporteService.js";
import { asincrono } from "../utils/errores.js";
import { ROLES } from "../../../shared/negocio.js";

const quiereTodos = (req) => req.query.todos === "true" && req.usuario && req.usuario.rol === ROLES.ADMIN;
const campos = (obj, lista) => Object.fromEntries(lista.filter((c) => obj[c] !== undefined).map((c) => [c, obj[c]]));

const CAMPOS_SERVICIO = ["nombre", "categoria", "duracionMin", "precio", "descripcion", "activo"];
const CAMPOS_BARBERO = ["nombre", "especialidad", "experiencia", "servicios", "almuerzoInicio", "almuerzoFin", "activo"];

export const authCtrl = {
  registro: asincrono(async (req, res) => res.status(201).json(await auth.registrar(req.body))),
  login: asincrono(async (req, res) => res.json(await auth.iniciarSesion(req.body))),
  yo: asincrono(async (req, res) => res.json(await auth.usuarioPublico(req.usuario))),
};

export const serviciosCtrl = {
  listar: asincrono(async (req, res) => res.json(await catalogo.listarServicios({ todos: quiereTodos(req) }))),
  obtener: asincrono(async (req, res) => res.json(catalogo.servicioPlano(await catalogo.obtenerServicio(req.params.id)))),
  crear: asincrono(async (req, res) => res.status(201).json(await catalogo.crearServicio(campos(req.body, CAMPOS_SERVICIO)))),
  actualizar: asincrono(async (req, res) => res.json(await catalogo.actualizarServicio(req.params.id, campos(req.body, CAMPOS_SERVICIO)))),
  eliminar: asincrono(async (req, res) => res.json(await catalogo.desactivarServicio(req.params.id))),
};

export const barberosCtrl = {
  listar: asincrono(async (req, res) => res.json(await catalogo.listarBarberos({ todos: quiereTodos(req) }))),
  obtener: asincrono(async (req, res) => res.json(catalogo.barberoPlano(await catalogo.obtenerBarbero(req.params.id)))),
  crear: asincrono(async (req, res) => res.status(201).json(await catalogo.crearBarbero(campos(req.body, CAMPOS_BARBERO)))),
  actualizar: asincrono(async (req, res) => res.json(await catalogo.actualizarBarbero(req.params.id, campos(req.body, CAMPOS_BARBERO)))),
  eliminar: asincrono(async (req, res) => res.json(await catalogo.desactivarBarbero(req.params.id))),
  disponibilidad: asincrono(async (req, res) => res.json(await agenda.disponibilidad(req.params.id, req.query))),
  proximosLibres: asincrono(async (req, res) => res.json(await agenda.proximosLibres({ servicioId: Number(req.query.servicioId) || 1 }))),
};

export const turnosCtrl = {
  listar: asincrono(async (req, res) => res.json(await agenda.listarTurnos(req.usuario, req.query))),
  reservar: asincrono(async (req, res) => res.status(201).json(await agenda.reservar(req.usuario, req.body))),
  cambiarEstado: asincrono(async (req, res) => res.json(await agenda.cambiarEstado(req.usuario, req.params.id, req.body.estado))),
};

export const reportesCtrl = {
  resumen: asincrono(async (req, res) => res.json(await reportes.resumen(req.query))),
};
