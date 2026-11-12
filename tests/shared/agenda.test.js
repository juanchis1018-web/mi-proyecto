/**
 * Pruebas unitarias de las reglas de negocio de la agenda (shared/agenda.js).
 * Se fija la zona horaria para que los resultados no dependan del equipo.
 */
process.env.TZ = "America/Bogota";

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  seSolapan,
  franjasDisponibles,
  validarReserva,
  sePuedeCancelar,
  puedeTransicionar,
  ocupacion,
  desdeISOFecha,
  aISOFecha,
  codigoTurno,
  proximoLibre,
} from "../../shared/agenda.js";

const servicioCorte = { id: 1, nombre: "Corte clásico", duracionMin: 30, precio: 25000, activo: true };
const servicioLargo = { id: 2, nombre: "Corte con diseño", duracionMin: 60, precio: 38000, activo: true };
const barbero = { id: 1, nombre: "Andrés", servicios: [1, 2], almuerzoInicio: "12:00", almuerzoFin: "13:00", activo: true };

// Martes 10 de noviembre de 2026, 7:00 a. m. (antes de abrir)
const ahora = new Date(2026, 10, 10, 7, 0);
const martes = new Date(2026, 10, 10);
const domingo = new Date(2026, 10, 15);
const turno = (h, m, dur, estado = "CONFIRMADO", barberoId = 1) => {
  const inicio = new Date(2026, 10, 10, h, m);
  return { barberoId, inicio: inicio.toISOString(), fin: new Date(inicio.getTime() + dur * 60000).toISOString(), estado };
};
const horas = (franjas) => franjas.map((f) => new Date(f.inicio).toTimeString().slice(0, 5));

describe("seSolapan", () => {
  test("detecta intervalos que se cruzan", () => {
    assert.equal(seSolapan(new Date(2026, 0, 1, 10), new Date(2026, 0, 1, 11), new Date(2026, 0, 1, 10, 30), new Date(2026, 0, 1, 11, 30)), true);
  });
  test("intervalos contiguos no se solapan", () => {
    assert.equal(seSolapan(new Date(2026, 0, 1, 10), new Date(2026, 0, 1, 11), new Date(2026, 0, 1, 11), new Date(2026, 0, 1, 12)), false);
  });
  test("un intervalo contenido en otro se solapa", () => {
    assert.equal(seSolapan(new Date(2026, 0, 1, 9), new Date(2026, 0, 1, 12), new Date(2026, 0, 1, 10), new Date(2026, 0, 1, 10, 30)), true);
  });
});

describe("franjasDisponibles", () => {
  test("un día vacío ofrece todas las franjas menos el almuerzo", () => {
    const franjas = franjasDisponibles({ barbero, servicio: servicioCorte, fecha: martes, turnos: [], ahora });
    // 9:00 a 19:00 en bloques de 30 min = 20 franjas, menos 2 del almuerzo
    assert.equal(franjas.length, 18);
    assert.ok(!horas(franjas).includes("12:00"));
    assert.ok(!horas(franjas).includes("12:30"));
    assert.equal(horas(franjas)[0], "09:00");
    assert.equal(horas(franjas).at(-1), "18:30");
  });

  test("un servicio de 60 minutos no puede empezar a las 11:30 porque cruza el almuerzo", () => {
    const franjas = horas(franjasDisponibles({ barbero, servicio: servicioLargo, fecha: martes, turnos: [], ahora }));
    assert.ok(franjas.includes("11:00"));
    assert.ok(!franjas.includes("11:30"));
    assert.ok(!franjas.includes("18:30"), "no cabe antes del cierre");
  });

  test("excluye las franjas ocupadas por turnos activos y respeta los cancelados", () => {
    const turnos = [turno(10, 0, 60), turno(15, 0, 30, "CANCELADO")];
    const franjas = horas(franjasDisponibles({ barbero, servicio: servicioCorte, fecha: martes, turnos, ahora }));
    assert.ok(!franjas.includes("10:00"));
    assert.ok(!franjas.includes("10:30"));
    assert.ok(franjas.includes("15:00"), "un turno cancelado libera la franja");
  });

  test("ignora los turnos de otros barberos", () => {
    const franjas = horas(franjasDisponibles({ barbero, servicio: servicioCorte, fecha: martes, turnos: [turno(10, 0, 60, "CONFIRMADO", 2)], ahora }));
    assert.ok(franjas.includes("10:00"));
  });

  test("no ofrece horas que ya pasaron", () => {
    const franjas = horas(franjasDisponibles({ barbero, servicio: servicioCorte, fecha: martes, turnos: [], ahora: new Date(2026, 10, 10, 16, 10) }));
    assert.deepEqual(franjas, ["16:30", "17:00", "17:30", "18:00", "18:30"]);
  });

  test("el domingo no hay atención", () => {
    assert.deepEqual(franjasDisponibles({ barbero, servicio: servicioCorte, fecha: domingo, turnos: [], ahora }), []);
  });

  test("no hay franjas si el barbero no presta el servicio o está inactivo", () => {
    assert.deepEqual(franjasDisponibles({ barbero: { ...barbero, servicios: [2] }, servicio: servicioCorte, fecha: martes, turnos: [], ahora }), []);
    assert.deepEqual(franjasDisponibles({ barbero: { ...barbero, activo: false }, servicio: servicioCorte, fecha: martes, turnos: [], ahora }), []);
  });
});

describe("validarReserva", () => {
  test("acepta una franja libre y calcula la hora de fin", () => {
    const r = validarReserva({ barbero, servicio: servicioLargo, inicio: new Date(2026, 10, 10, 9, 0), turnos: [], ahora });
    assert.equal(r.ok, true);
    assert.equal(new Date(r.fin).getHours(), 10);
  });

  test("rechaza una franja que se solapa con otro turno (409)", () => {
    const r = validarReserva({ barbero, servicio: servicioLargo, inicio: new Date(2026, 10, 10, 9, 30), turnos: [turno(10, 0, 30)], ahora });
    assert.equal(r.ok, false);
    assert.equal(r.codigo, "FRANJA_OCUPADA");
  });

  test("rechaza fechas pasadas, muy lejanas o inválidas", () => {
    assert.equal(validarReserva({ barbero, servicio: servicioCorte, inicio: new Date(2026, 10, 9, 10), turnos: [], ahora }).codigo, "FECHA_PASADA");
    assert.equal(validarReserva({ barbero, servicio: servicioCorte, inicio: new Date(2026, 11, 30, 10), turnos: [], ahora }).codigo, "FECHA_LEJANA");
    assert.equal(validarReserva({ barbero, servicio: servicioCorte, inicio: "no-es-fecha", turnos: [], ahora }).codigo, "FECHA_INVALIDA");
  });

  test("rechaza un servicio que el barbero no presta", () => {
    const r = validarReserva({ barbero: { ...barbero, servicios: [2] }, servicio: servicioCorte, inicio: new Date(2026, 10, 10, 9), turnos: [], ahora });
    assert.equal(r.codigo, "SERVICIO_NO_PRESTADO");
  });

  test("rechaza horas que no están alineadas a la agenda (por ejemplo 9:10)", () => {
    const r = validarReserva({ barbero, servicio: servicioCorte, inicio: new Date(2026, 10, 10, 9, 10), turnos: [], ahora });
    assert.equal(r.codigo, "FRANJA_OCUPADA");
  });
});

describe("cancelación y estados", () => {
  test("se puede cancelar con 2 horas o más de anticipación", () => {
    const t = turno(10, 0, 30);
    assert.equal(sePuedeCancelar(t, new Date(2026, 10, 10, 8, 0)), true);
    assert.equal(sePuedeCancelar(t, new Date(2026, 10, 10, 8, 1)), false);
    assert.equal(sePuedeCancelar({ ...t, estado: "ATENDIDO" }, ahora), false);
  });

  test("respeta la máquina de estados", () => {
    assert.equal(puedeTransicionar("PENDIENTE", "CONFIRMADO"), true);
    assert.equal(puedeTransicionar("CONFIRMADO", "ATENDIDO"), true);
    assert.equal(puedeTransicionar("PENDIENTE", "ATENDIDO"), false);
    assert.equal(puedeTransicionar("CANCELADO", "CONFIRMADO"), false);
    assert.equal(puedeTransicionar("ATENDIDO", "NO_ASISTIO"), false);
  });
});

describe("utilidades", () => {
  test("ocupación descuenta el almuerzo", () => {
    // 9 horas laborables (540 min); 2 turnos de 60 min = 120 min
    const valor = ocupacion({ barbero, fecha: martes, turnos: [turno(9, 0, 60), turno(14, 0, 60)] });
    assert.equal(Number(valor.toFixed(3)), Number((120 / 540).toFixed(3)));
  });

  test("convierte fechas ISO cortas y rechaza fechas imposibles", () => {
    assert.equal(aISOFecha(desdeISOFecha("2026-11-12")), "2026-11-12");
    assert.equal(desdeISOFecha("2026-02-30"), null);
    assert.equal(desdeISOFecha("12/11/2026"), null);
  });

  test("genera códigos de turno legibles", () => {
    assert.equal(codigoTurno(42, "Kevin Ospina"), "K-042");
    assert.equal(codigoTurno(1234, "andrés"), "A-234");
  });

  test("encuentra el próximo espacio libre aunque el día esté lleno", () => {
    const lleno = Array.from({ length: 20 }, (_, i) => turno(9 + Math.floor(i / 2), (i % 2) * 30, 30)).filter((t) => {
      const h = new Date(t.inicio).getHours();
      return h !== 12;
    });
    const libre = proximoLibre({ barbero, servicio: servicioCorte, turnos: lleno, ahora });
    assert.equal(aISOFecha(libre.inicio), "2026-11-11");
  });
});
