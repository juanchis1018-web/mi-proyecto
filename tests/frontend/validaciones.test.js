/** Pruebas de las validaciones de formularios del frontend. */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as v from "../../frontend/src/utils/validaciones.js";

test("nombre: exige 3 letras y solo caracteres de nombre", () => {
  assert.equal(v.nombre("Camilo Pérez"), "");
  assert.equal(v.nombre("Ñoño D'Alemán"), "");
  assert.notEqual(v.nombre("Al"), "");
  assert.notEqual(v.nombre("<script>"), "");
  assert.notEqual(v.nombre("x".repeat(61)), "");
});

test("email: formato básico", () => {
  assert.equal(v.email("cliente@corteya.co"), "");
  assert.notEqual(v.email("cliente@corteya"), "");
  assert.notEqual(v.email(""), "");
});

test("celular: 10 dígitos que empiezan por 3, admite espacios", () => {
  assert.equal(v.celular("310 456 7890"), "");
  assert.equal(v.celular("3104567890"), "");
  assert.notEqual(v.celular("6015550142"), "");
  assert.notEqual(v.celular("31045"), "");
});

test("password: mínimo 8 caracteres con letras y números", () => {
  assert.equal(v.password("Corte2026"), "");
  assert.notEqual(v.password("corto1"), "");
  assert.notEqual(v.password("soloLetras"), "");
});

test("duración del servicio: múltiplo de 30 entre 30 y 180", () => {
  assert.equal(v.duracionServicio("60"), "");
  assert.notEqual(v.duracionServicio("45"), "");
  assert.notEqual(v.duracionServicio("240"), "");
  assert.notEqual(v.duracionServicio("abc"), "");
});

test("hora: formato HH:MM", () => {
  assert.equal(v.hora("13:30"), "");
  assert.notEqual(v.hora("25:00"), "");
  assert.notEqual(v.hora("1:30"), "");
});
