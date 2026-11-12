/** Rutas de la API REST versionada en /api/v1. */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { autenticar, autenticarOpcional, autorizar } from "../middlewares/autenticacion.js";
import * as v from "../middlewares/validacion.js";
import { authCtrl, serviciosCtrl, barberosCtrl, turnosCtrl, reportesCtrl } from "../controllers/index.js";
import { config } from "../config/index.js";
import { ROLES } from "../../../shared/negocio.js";

const { ADMIN, BARBERO, CLIENTE } = ROLES;
const api = Router();

// Límite de intentos para frenar ataques de fuerza bruta sobre las credenciales
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.esPrueba ? 1000 : 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ error: { status: 429, mensaje: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.", detalles: [] } }),
});

api.get("/salud", (_req, res) => res.json({ estado: "ok", modo: "api", hora: new Date().toISOString() }));

/* Autenticación */
api.post("/auth/registro", limiteAuth, v.validar(v.reglasRegistro), authCtrl.registro);
api.post("/auth/login", limiteAuth, v.validar(v.reglasLogin), authCtrl.login);
api.get("/auth/yo", autenticar, authCtrl.yo);

/* Servicios */
api.get("/servicios", autenticarOpcional, serviciosCtrl.listar);
api.get("/servicios/:id", v.validar([v.id]), serviciosCtrl.obtener);
api.post("/servicios", autenticar, autorizar(ADMIN), v.validar(v.reglasServicio()), serviciosCtrl.crear);
api.put("/servicios/:id", autenticar, autorizar(ADMIN), v.validar([v.id, ...v.reglasServicio(true)]), serviciosCtrl.actualizar);
api.delete("/servicios/:id", autenticar, autorizar(ADMIN), v.validar([v.id]), serviciosCtrl.eliminar);

/* Barberos y disponibilidad */
api.get("/barberos", autenticarOpcional, barberosCtrl.listar);
api.get("/barberos/proximos-libres", barberosCtrl.proximosLibres);
api.get("/barberos/:id", v.validar([v.id]), barberosCtrl.obtener);
api.get("/barberos/:id/disponibilidad", v.validar(v.reglasDisponibilidad), barberosCtrl.disponibilidad);
api.post("/barberos", autenticar, autorizar(ADMIN), v.validar(v.reglasBarbero()), barberosCtrl.crear);
api.put("/barberos/:id", autenticar, autorizar(ADMIN), v.validar([v.id, ...v.reglasBarbero(true)]), barberosCtrl.actualizar);
api.delete("/barberos/:id", autenticar, autorizar(ADMIN), v.validar([v.id]), barberosCtrl.eliminar);

/* Turnos */
api.get("/turnos", autenticar, v.validar(v.reglasFiltroTurnos), turnosCtrl.listar);
api.post("/turnos", autenticar, autorizar(CLIENTE, ADMIN), v.validar(v.reglasReserva), turnosCtrl.reservar);
api.patch("/turnos/:id/estado", autenticar, autorizar(CLIENTE, BARBERO, ADMIN), v.validar([v.id, ...v.reglasEstado]), turnosCtrl.cambiarEstado);

/* Reportes */
api.get("/reportes/resumen", autenticar, autorizar(ADMIN), v.validar(v.reglasFecha), reportesCtrl.resumen);

export default api;
