/** Pruebas de seguridad y manejo de errores (OWASP: inyección, XSS, cabeceras, errores). */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { prepararApp, token, cuentas, diaHabil, sequelize } from "./preparacion.js";

let api;
before(async () => (api = await prepararApp()));
after(() => sequelize.close());

test("envía cabeceras de seguridad y oculta la tecnología del servidor", async () => {
  const r = await api.get("/");
  assert.equal(r.status, 200);
  assert.match(r.headers["content-security-policy"], /script-src 'self'/);
  assert.equal(r.headers["x-content-type-options"], "nosniff");
  assert.equal(r.headers["x-frame-options"], "SAMEORIGIN");
  assert.equal(r.headers["x-powered-by"], undefined);
});

test("intentos de inyección SQL en el login no causan errores ni acceso", async () => {
  const intentos = ["' OR '1'='1", "admin@corteya.co' --", "admin@corteya.co\" OR \"\"=\""];
  for (const email of intentos) {
    const r = await api.post("/api/v1/auth/login").send({ email, password: "' OR '1'='1" });
    assert.ok([401, 422].includes(r.status), `respuesta ${r.status} para ${email}`);
  }
  const r = await api.post("/api/v1/auth/login").send({ email: "admin@corteya.co", password: "' OR '1'='1" });
  assert.equal(r.status, 401);
});

test("parámetros con inyección en filtros son rechazados por validación", async () => {
  const t = await token(api, ...cuentas.admin);
  const r = await api.get("/api/v1/turnos?estado=CANCELADO'%20OR%201=1--").set("Authorization", t);
  assert.equal(r.status, 422);
});

test("el texto con HTML se guarda como texto (el frontend lo muestra sin interpretarlo)", async () => {
  const t = await token(api, ...cuentas.cliente);
  const nota = '<img src=x onerror="alert(1)">';
  const r = await api.post("/api/v1/turnos").set("Authorization", t).send({ barberoId: 1, servicioId: 1, inicio: diaHabil(9, 0).toISOString(), nota });
  assert.equal(r.status, 201);
  assert.equal(r.body.nota, nota);
});

test("nombres con HTML son rechazados en el registro", async () => {
  const r = await api.post("/api/v1/auth/registro").send({ nombre: "<script>alert(1)</script>", email: "x@correo.com", celular: "3001112233", password: "Corte2026" });
  assert.equal(r.status, 422);
});

test("JSON mal formado responde 400 con mensaje claro", async () => {
  const r = await api.post("/api/v1/auth/login").set("Content-Type", "application/json").send('{"email": ');
  assert.equal(r.status, 400);
  assert.match(r.body.error.mensaje, /JSON/);
});

test("rutas inexistentes de la API responden 404 en JSON", async () => {
  const r = await api.get("/api/v1/no-existe");
  assert.equal(r.status, 404);
  assert.equal(r.body.error.status, 404);
});

test("cuerpos demasiado grandes son rechazados", async () => {
  const r = await api.post("/api/v1/auth/login").send({ email: "a@b.co", password: "x".repeat(30000) });
  assert.equal(r.status, 413);
});

test("expone la documentación OpenAPI y métricas", async () => {
  const doc = await api.get("/api/openapi.json");
  assert.equal(doc.status, 200);
  assert.equal(doc.body.openapi, "3.0.3");
  const metricas = await api.get("/metrics");
  assert.equal(metricas.status, 200);
  assert.match(metricas.text, /corteya_http_duracion_segundos/);
});
