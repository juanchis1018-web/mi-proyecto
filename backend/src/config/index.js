/**
 * Configuración centralizada. Todos los valores sensibles vienen de variables
 * de entorno (archivo .env en desarrollo); nada sensible queda en el código.
 */
import "dotenv/config";
import { resolve } from "node:path";
import { NEGOCIO } from "../../../shared/negocio.js";

// La agenda se calcula en la hora local de la barbería, sin importar dónde corra el servidor
process.env.TZ = process.env.TZ || NEGOCIO.zonaHoraria;

const entorno = process.env.NODE_ENV || "development";
const RAIZ = resolve(import.meta.dirname, "../../..");

function secretoJwt() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (entorno === "production") throw new Error("Falta la variable de entorno JWT_SECRET.");
  return "clave-solo-para-desarrollo-no-usar-en-produccion";
}

export const config = Object.freeze({
  entorno,
  esPrueba: entorno === "test",
  esProduccion: entorno === "production",
  puerto: Number(process.env.PORT) || 3000,
  raiz: RAIZ,
  jwt: { secreto: secretoJwt(), expira: process.env.JWT_EXPIRA || "8h" },
  db: {
    url: process.env.DATABASE_URL || null,
    dialecto: process.env.DB_DIALECT || "sqlite",
    almacenamiento: entorno === "test" ? ":memory:" : resolve(RAIZ, process.env.DB_STORAGE || "datos/corteya.sqlite"),
    ssl: process.env.DB_SSL === "true",
  },
  sembrarDatos: process.env.SEMBRAR_DATOS !== "false",
  corsOrigenes: (process.env.CORS_ORIGENES || "").split(",").map((o) => o.trim()).filter(Boolean),
});
