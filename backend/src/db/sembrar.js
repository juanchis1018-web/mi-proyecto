/**
 * Carga de datos iniciales (seeder): servicios, barberos, cuentas de demostración
 * y turnos simulados de la semana. Se ejecuta al iniciar si la base está vacía,
 * o manualmente con `npm run seed` (reinicia la base de datos).
 */
import { pathToFileURL } from "node:url";
import { sequelize, Usuario, Servicio, Barbero, Turno } from "../models/index.js";
import { cifrarPassword } from "../services/authService.js";
import { SERVICIOS, BARBEROS, CUENTAS_DEMO, generarTurnos } from "../../../shared/datosIniciales.js";
import { ROLES } from "../../../shared/negocio.js";

export async function sembrar({ conTurnos = true, ahora = new Date() } = {}) {
  await sequelize.transaction(async (transaction) => {
    const opciones = { transaction };
    await Usuario.bulkCreate(
      await Promise.all(
        [CUENTAS_DEMO.admin, CUENTAS_DEMO.cliente].map(async (c) => ({ nombre: c.nombre, email: c.email, celular: c.celular, rol: c.rol, passwordHash: await cifrarPassword(c.password) }))
      ),
      opciones
    );
    await Servicio.bulkCreate(SERVICIOS.map(({ id, ...s }) => s), opciones);

    const hashBarbero = await cifrarPassword(CUENTAS_DEMO.barberoPassword);
    for (const [i, b] of BARBEROS.entries()) {
      const usuario = await Usuario.create({ nombre: b.nombre, email: b.email, celular: `31000000${i}0`, rol: ROLES.BARBERO, passwordHash: hashBarbero }, opciones);
      const barbero = await Barbero.create(
        { nombre: b.nombre, especialidad: b.especialidad, experiencia: b.experiencia, almuerzoInicio: b.almuerzoInicio, almuerzoFin: b.almuerzoFin, usuarioId: usuario.id },
        opciones
      );
      await barbero.setServicios(b.servicios, opciones);
    }

    if (conTurnos) {
      const turnos = generarTurnos({ ahora }).map((t) => ({ ...t, inicio: new Date(t.inicio), fin: new Date(t.fin), nota: "" }));
      await Turno.bulkCreate(turnos, opciones);
    }
  });
}

export async function estaVacia() {
  return (await Usuario.count()) === 0;
}

// Ejecución directa: npm run seed → borra y vuelve a crear las tablas con datos de demostración
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await sequelize.sync({ force: true });
  await sembrar();
  console.log("Base de datos reiniciada con datos de demostración.");
  await sequelize.close();
}
