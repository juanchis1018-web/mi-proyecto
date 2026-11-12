/**
 * Modelos de datos (ORM) y sus relaciones.
 * Usuario 1—0..1 Barbero, Barbero N—M Servicio, Turno N—1 Barbero/Servicio/Usuario(cliente).
 */
import { DataTypes } from "sequelize";
import { sequelize } from "../db/sequelize.js";
import { ROLES, ESTADOS, CATEGORIAS } from "../../../shared/negocio.js";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const Usuario = sequelize.define(
  "Usuario",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    email: { type: DataTypes.STRING(120), allowNull: false, unique: true, validate: { isEmail: true } },
    celular: { type: DataTypes.STRING(10), allowNull: true },
    passwordHash: { type: DataTypes.STRING(100), allowNull: false },
    rol: { type: DataTypes.STRING(10), allowNull: false, defaultValue: ROLES.CLIENTE, validate: { isIn: [Object.values(ROLES)] } },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "usuarios" }
);

export const Servicio = sequelize.define(
  "Servicio",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    categoria: { type: DataTypes.STRING(10), allowNull: false, validate: { isIn: [CATEGORIAS.map((c) => c.id)] } },
    duracionMin: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 30, max: 180 } },
    precio: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
    descripcion: { type: DataTypes.STRING(200), allowNull: false, defaultValue: "" },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "servicios" }
);

export const Barbero = sequelize.define(
  "Barbero",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(60), allowNull: false },
    especialidad: { type: DataTypes.STRING(80), allowNull: false },
    experiencia: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    almuerzoInicio: { type: DataTypes.STRING(5), allowNull: false, validate: { is: HORA } },
    almuerzoFin: { type: DataTypes.STRING(5), allowNull: false, validate: { is: HORA } },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    usuarioId: { type: DataTypes.INTEGER, allowNull: true, unique: true },
  },
  { tableName: "barberos" }
);

export const BarberoServicio = sequelize.define("BarberoServicio", {}, { tableName: "barbero_servicio", timestamps: false });

export const Turno = sequelize.define(
  "Turno",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    clienteId: { type: DataTypes.INTEGER, allowNull: true },
    nombreCliente: { type: DataTypes.STRING(60), allowNull: false },
    celularCliente: { type: DataTypes.STRING(10), allowNull: true },
    barberoId: { type: DataTypes.INTEGER, allowNull: false },
    servicioId: { type: DataTypes.INTEGER, allowNull: false },
    inicio: { type: DataTypes.DATE, allowNull: false },
    fin: { type: DataTypes.DATE, allowNull: false },
    estado: { type: DataTypes.STRING(12), allowNull: false, defaultValue: ESTADOS.PENDIENTE, validate: { isIn: [Object.values(ESTADOS)] } },
    precio: { type: DataTypes.INTEGER, allowNull: false },
    nota: { type: DataTypes.STRING(140), allowNull: false, defaultValue: "" },
    origen: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "WEB", validate: { isIn: [["WEB", "MOSTRADOR"]] } },
  },
  { tableName: "turnos", indexes: [{ fields: ["barbero_id", "inicio"] }, { fields: ["cliente_id"] }] }
);

/* Relaciones -------------------------------------------------------------- */
Usuario.hasOne(Barbero, { foreignKey: "usuarioId", as: "perfilBarbero" });
Barbero.belongsTo(Usuario, { foreignKey: "usuarioId", as: "usuario" });

Barbero.belongsToMany(Servicio, { through: BarberoServicio, foreignKey: "barberoId", otherKey: "servicioId", as: "servicios" });
Servicio.belongsToMany(Barbero, { through: BarberoServicio, foreignKey: "servicioId", otherKey: "barberoId", as: "barberos" });

Turno.belongsTo(Barbero, { foreignKey: "barberoId", as: "barbero" });
Turno.belongsTo(Servicio, { foreignKey: "servicioId", as: "servicio" });
Turno.belongsTo(Usuario, { foreignKey: "clienteId", as: "cliente" });
Barbero.hasMany(Turno, { foreignKey: "barberoId", as: "turnos" });
Usuario.hasMany(Turno, { foreignKey: "clienteId", as: "turnos" });

export { sequelize };
