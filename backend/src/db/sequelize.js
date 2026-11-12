/**
 * Conexión a la base de datos con Sequelize.
 * SQLite en desarrollo y pruebas; PostgreSQL en producción (DATABASE_URL).
 */
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Sequelize } from "sequelize";
import { config } from "../config/index.js";

function crearConexion() {
  const comunes = { logging: false, define: { underscored: true, freezeTableName: false } };

  if (config.db.url) {
    return new Sequelize(config.db.url, {
      ...comunes,
      dialect: "postgres",
      dialectOptions: config.db.ssl ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    });
  }

  if (config.db.almacenamiento !== ":memory:") mkdirSync(dirname(config.db.almacenamiento), { recursive: true });
  return new Sequelize({ ...comunes, dialect: "sqlite", storage: config.db.almacenamiento });
}

export const sequelize = crearConexion();
