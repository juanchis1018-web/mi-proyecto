/** Pruebas de integración: registro, inicio de sesión y verificación del token. */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { prepararApp, token, cuentas, sequelize } from "./preparacion.js";

let api;
before(async () => (api = await prepararApp()));
after(() => sequelize.close());

const nuevo = { nombre: "Laura Gómez", email: "laura@correo.com", celular: "300 123 4567", password: "Corte2026" };

test("registro: crea un cliente y devuelve token sin exponer la contraseña", async () => {
  const r = await api.post("/api/v1/auth/registro").send(nuevo);
  assert.equal(r.status, 201);
  assert.ok(r.body.token);
  assert.equal(r.body.usuario.rol, "CLIENTE");
  assert.equal(r.body.usuario.celular, "3001234567");
  assert.equal(r.body.usuario.passwordHash, undefined);
});

test("registro: rechaza correo duplicado con 409", async () => {
  const r = await api.post("/api/v1/auth/registro").send({ ...nuevo, email: "LAURA@correo.com" });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.detalles[0].campo, "email");
});

test("registro: valida cada campo y responde 422 con detalles", async () => {
  const r = await api.post("/api/v1/auth/registro").send({ nombre: "A", email: "no-es-correo", celular: "123", password: "corta" });
  assert.equal(r.status, 422);
  const campos = r.body.error.detalles.map((d) => d.campo).sort();
  assert.deepEqual(campos, ["celular", "email", "nombre", "password"]);
});

test("registro: no permite elegir el rol (siempre CLIENTE)", async () => {
  const r = await api.post("/api/v1/auth/registro").send({ ...nuevo, email: "intruso@correo.com", rol: "ADMIN" });
  assert.equal(r.status, 201);
  assert.equal(r.body.usuario.rol, "CLIENTE");
});

test("login: credenciales correctas e incorrectas", async () => {
  const ok = await api.post("/api/v1/auth/login").send({ email: cuentas.admin[0], password: cuentas.admin[1] });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.usuario.rol, "ADMIN");

  const mal = await api.post("/api/v1/auth/login").send({ email: cuentas.admin[0], password: "otra-clave" });
  assert.equal(mal.status, 401);
  const inexistente = await api.post("/api/v1/auth/login").send({ email: "nadie@corteya.co", password: "Admin123*" });
  assert.equal(inexistente.status, 401);
  assert.equal(mal.body.error.mensaje, inexistente.body.error.mensaje, "no revela si el correo existe");
});

test("yo: exige token válido", async () => {
  assert.equal((await api.get("/api/v1/auth/yo")).status, 401);
  assert.equal((await api.get("/api/v1/auth/yo").set("Authorization", "Bearer token.falso.123")).status, 401);

  const t = await token(api, ...cuentas.andres);
  const r = await api.get("/api/v1/auth/yo").set("Authorization", t);
  assert.equal(r.status, 200);
  assert.equal(r.body.rol, "BARBERO");
  assert.equal(r.body.barberoId, 1);
});

test("un token alterado (cambiando el rol) es rechazado", async () => {
  const t = (await token(api, ...cuentas.cliente)).slice(7);
  const [cabecera, carga, firma] = t.split(".");
  const datos = JSON.parse(Buffer.from(carga, "base64url").toString());
  const alterado = Buffer.from(JSON.stringify({ ...datos, rol: "ADMIN", sub: "1" })).toString("base64url");
  const r = await api.get("/api/v1/reportes/resumen").set("Authorization", `Bearer ${cabecera}.${alterado}.${firma}`);
  assert.equal(r.status, 401);
});
