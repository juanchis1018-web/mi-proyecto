/**
 * Preparación común de las pruebas de la API: entorno de prueba, base de datos
 * SQLite en memoria con datos de demostración (sin turnos) y utilidades.
 */
process.env.NODE_ENV = "test";
process.env.TZ = "America/Bogota";
process.env.JWT_SECRET = "clave-de-pruebas";

const { sequelize } = await import("../../backend/src/models/index.js");
const { sembrar } = await import("../../backend/src/db/sembrar.js");
const { crearApp } = await import("../../backend/src/app.js");
const { default: request } = await import("supertest");

export async function prepararApp() {
  await sequelize.sync({ force: true });
  await sembrar({ conTurnos: false });
  return request(crearApp());
}

export async function token(agente, email, password) {
  const r = await agente.post("/api/v1/auth/login").send({ email, password });
  if (r.status !== 200) throw new Error(`No se pudo iniciar sesión como ${email}: ${r.status}`);
  return `Bearer ${r.body.token}`;
}

export const cuentas = {
  admin: ["admin@corteya.co", "Admin123*"],
  cliente: ["cliente@corteya.co", "Cliente123*"],
  andres: ["andres@corteya.co", "Barbero123*"],
  kevin: ["kevin@corteya.co", "Barbero123*"],
};

/** Próximo día hábil (lunes a sábado) a partir de pasado mañana, a la hora indicada. */
export function diaHabil(hora = 10, minuto = 0, desplazamiento = 2) {
  const d = new Date();
  d.setDate(d.getDate() + desplazamiento);
  while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

export const fechaCorta = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export { sequelize };
