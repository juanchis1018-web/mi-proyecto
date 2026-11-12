/** Pruebas del cálculo de indicadores del panel (shared/reportes.js). */
process.env.TZ = "America/Bogota";

import { test } from "node:test";
import assert from "node:assert/strict";
import { resumenDelDia } from "../../shared/reportes.js";

const barberos = [
  { id: 1, nombre: "Andrés", activo: true, almuerzoInicio: "12:00", almuerzoFin: "13:00", servicios: [1] },
  { id: 2, nombre: "Kevin", activo: true, almuerzoInicio: "13:00", almuerzoFin: "14:00", servicios: [1] },
];
const t = (barberoId, h, estado, precio = 25000) => {
  const inicio = new Date(2026, 10, 10, h, 0);
  return { barberoId, servicioId: 1, inicio: inicio.toISOString(), fin: new Date(inicio.getTime() + 30 * 60000).toISOString(), estado, precio };
};

test("calcula turnos, cancelados, inasistencias e ingresos del día", () => {
  const turnos = [t(1, 9, "ATENDIDO"), t(1, 10, "NO_ASISTIO"), t(2, 9, "ATENDIDO"), t(2, 15, "CONFIRMADO"), t(2, 16, "CANCELADO"), t(1, 9, "ATENDIDO", 99999)];
  turnos[5].inicio = new Date(2026, 10, 11, 9).toISOString(); // otro día: no cuenta
  const r = resumenDelDia({ fecha: new Date(2026, 10, 10), turnos, barberos });
  assert.equal(r.totalTurnos, 4);
  assert.equal(r.cancelados, 1);
  assert.equal(r.turnosCumplidos, 3);
  assert.equal(r.inasistencias, 1);
  assert.equal(r.tasaInasistencia, 0.333);
  assert.equal(r.ingresos, 50000);
  assert.equal(r.ingresosProyectados, 75000);
  assert.equal(r.porHora.find((h) => h.hora === 9).turnos, 2);
  assert.equal(r.porBarbero.length, 2);
});

test("un día sin turnos devuelve indicadores en cero", () => {
  const r = resumenDelDia({ fecha: new Date(2026, 10, 10), turnos: [], barberos });
  assert.equal(r.totalTurnos, 0);
  assert.equal(r.tasaInasistencia, 0);
  assert.equal(r.ocupacionPromedio, 0);
});
