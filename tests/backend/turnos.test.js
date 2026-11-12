/** Pruebas de integración: disponibilidad, reservas, permisos y estados de los turnos. */
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { prepararApp, token, cuentas, diaHabil, fechaCorta, sequelize } from "./preparacion.js";

let api, admin, cliente, andres, kevin, otroCliente;
before(async () => {
  api = await prepararApp();
  admin = await token(api, ...cuentas.admin);
  cliente = await token(api, ...cuentas.cliente);
  andres = await token(api, ...cuentas.andres);
  kevin = await token(api, ...cuentas.kevin);
  const r = await api.post("/api/v1/auth/registro").send({ nombre: "Otro Cliente", email: "otro@correo.com", celular: "3005556677", password: "Corte2026" });
  otroCliente = `Bearer ${r.body.token}`;
});
after(() => sequelize.close());

const reservar = (quien, datos) => api.post("/api/v1/turnos").set("Authorization", quien).send(datos);

describe("disponibilidad", () => {
  test("devuelve 7 días con franjas y excluye el almuerzo del barbero", async () => {
    const dia = diaHabil();
    const r = await api.get(`/api/v1/barberos/1/disponibilidad?servicioId=1&desde=${fechaCorta(dia)}&dias=7`);
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 7);
    const horas = r.body[0].franjas.map((f) => new Date(f.inicio).getHours() + ":" + String(new Date(f.inicio).getMinutes()).padStart(2, "0"));
    assert.equal(horas.length, 18);
    assert.ok(!horas.includes("12:00") && !horas.includes("12:30"));
  });

  test("valida los parámetros", async () => {
    assert.equal((await api.get("/api/v1/barberos/1/disponibilidad")).status, 422);
    assert.equal((await api.get("/api/v1/barberos/1/disponibilidad?servicioId=1&desde=12-11-2026")).status, 422);
    assert.equal((await api.get("/api/v1/barberos/99/disponibilidad?servicioId=1")).status, 404);
  });
});

describe("reservas", () => {
  test("el cliente reserva un turno a su nombre con el precio vigente", async () => {
    const inicio = diaHabil(10, 0);
    const r = await reservar(cliente, { barberoId: 1, servicioId: 2, inicio: inicio.toISOString(), nota: "Degradado bajo" });
    assert.equal(r.status, 201);
    assert.equal(r.body.estado, "PENDIENTE");
    assert.equal(r.body.nombreCliente, "Camilo Pérez");
    assert.equal(r.body.precio, 38000);
    assert.equal(r.body.origen, "WEB");
    assert.equal(new Date(r.body.fin) - new Date(r.body.inicio), 60 * 60000);
    assert.match(r.body.codigo, /^A-\d{3}$/);
  });

  test("rechaza con 409 una reserva que se solapa (10:30 cae dentro de 10:00 a 11:00)", async () => {
    const r = await reservar(otroCliente, { barberoId: 1, servicioId: 1, inicio: diaHabil(10, 30).toISOString() });
    assert.equal(r.status, 409);
  });

  test("la franja ocupada ya no aparece en la disponibilidad", async () => {
    const dia = diaHabil();
    const r = await api.get(`/api/v1/barberos/1/disponibilidad?servicioId=1&desde=${fechaCorta(dia)}&dias=1`);
    const inicios = r.body[0].franjas.map((f) => f.inicio);
    assert.ok(!inicios.includes(diaHabil(10, 0).toISOString()));
    assert.ok(!inicios.includes(diaHabil(10, 30).toISOString()));
    assert.ok(inicios.includes(diaHabil(11, 0).toISOString()));
  });

  test("de cinco reservas simultáneas para la misma franja solo una se acepta", async () => {
    const inicio = diaHabil(16, 0).toISOString();
    const respuestas = await Promise.all(Array.from({ length: 5 }, () => reservar(cliente, { barberoId: 2, servicioId: 1, inicio })));
    const estados = respuestas.map((r) => r.status).sort();
    assert.deepEqual(estados, [201, 409, 409, 409, 409]);
  });

  test("rechaza reservas en el pasado, en el almuerzo, en domingo o de un servicio no prestado", async () => {
    const ayer = new Date(Date.now() - 86400000);
    assert.equal((await reservar(cliente, { barberoId: 1, servicioId: 1, inicio: ayer.toISOString() })).status, 400);
    assert.equal((await reservar(cliente, { barberoId: 1, servicioId: 1, inicio: diaHabil(12, 0).toISOString() })).status, 409);
    const domingo = diaHabil(10, 0);
    while (domingo.getDay() !== 0) domingo.setDate(domingo.getDate() + 1);
    assert.equal((await reservar(cliente, { barberoId: 1, servicioId: 1, inicio: domingo.toISOString() })).status, 409);
    const r = await reservar(cliente, { barberoId: 2, servicioId: 2, inicio: diaHabil(9, 0).toISOString() });
    assert.equal(r.status, 400, "Kevin no hace cortes con diseño");
  });

  test("el administrador debe indicar el nombre del cliente del local", async () => {
    const sinNombre = await reservar(admin, { barberoId: 3, servicioId: 1, inicio: diaHabil(9, 0).toISOString() });
    assert.equal(sinNombre.status, 422);
    assert.equal(sinNombre.body.error.detalles[0].campo, "nombreCliente");
    const ok = await reservar(admin, { barberoId: 3, servicioId: 1, inicio: diaHabil(9, 0).toISOString(), nombreCliente: "Señor del mostrador", celularCliente: "311 222 3344" });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.origen, "MOSTRADOR");
    assert.equal(ok.body.celularCliente, "3112223344");
  });

  test("un barbero no puede reservar", async () => {
    assert.equal((await reservar(andres, { barberoId: 1, servicioId: 1, inicio: diaHabil(15, 0).toISOString() })).status, 403);
  });
});

describe("consulta y permisos sobre turnos", () => {
  test("cada rol ve solo lo que le corresponde", async () => {
    const delCliente = await api.get("/api/v1/turnos").set("Authorization", cliente);
    assert.ok(delCliente.body.length >= 2);
    assert.ok(delCliente.body.every((t) => t.nombreCliente === "Camilo Pérez"));

    const delOtro = await api.get("/api/v1/turnos").set("Authorization", otroCliente);
    assert.equal(delOtro.body.length, 0);

    const deAndres = await api.get("/api/v1/turnos").set("Authorization", andres);
    assert.ok(deAndres.body.length >= 1 && deAndres.body.every((t) => t.barberoId === 1));

    const todos = await api.get(`/api/v1/turnos?fecha=${fechaCorta(diaHabil())}`).set("Authorization", admin);
    assert.ok(todos.body.length >= 3);
  });

  test("un cliente no puede cancelar el turno de otro (responde 404 para no revelar que existe)", async () => {
    const [turno] = (await api.get("/api/v1/turnos").set("Authorization", cliente)).body;
    const r = await api.patch(`/api/v1/turnos/${turno.id}/estado`).set("Authorization", otroCliente).send({ estado: "CANCELADO" });
    assert.equal(r.status, 404);
  });

  test("un cliente solo puede cancelar, no confirmar ni marcar atendido", async () => {
    const [turno] = (await api.get("/api/v1/turnos").set("Authorization", cliente)).body;
    assert.equal((await api.patch(`/api/v1/turnos/${turno.id}/estado`).set("Authorization", cliente).send({ estado: "CONFIRMADO" })).status, 403);
  });

  test("un barbero no puede cambiar turnos de otro barbero", async () => {
    const turnoDeAndres = (await api.get("/api/v1/turnos").set("Authorization", andres)).body[0];
    const r = await api.patch(`/api/v1/turnos/${turnoDeAndres.id}/estado`).set("Authorization", kevin).send({ estado: "CONFIRMADO" });
    assert.equal(r.status, 403);
  });

  test("respeta la máquina de estados y no marca atendido un turno futuro", async () => {
    const turno = (await api.get("/api/v1/turnos").set("Authorization", andres)).body[0];
    const confirmado = await api.patch(`/api/v1/turnos/${turno.id}/estado`).set("Authorization", andres).send({ estado: "CONFIRMADO" });
    assert.equal(confirmado.status, 200);
    assert.equal(confirmado.body.estado, "CONFIRMADO");

    const atendido = await api.patch(`/api/v1/turnos/${turno.id}/estado`).set("Authorization", andres).send({ estado: "ATENDIDO" });
    assert.equal(atendido.status, 400, "el turno aún no empieza");

    const invalido = await api.patch(`/api/v1/turnos/${turno.id}/estado`).set("Authorization", andres).send({ estado: "PENDIENTE" });
    assert.equal(invalido.status, 400);
  });

  test("el cliente cancela su turno y la franja vuelve a quedar libre", async () => {
    const turno = (await api.get("/api/v1/turnos").set("Authorization", cliente)).body.find((t) => t.barberoId === 2);
    const r = await api.patch(`/api/v1/turnos/${turno.id}/estado`).set("Authorization", cliente).send({ estado: "CANCELADO" });
    assert.equal(r.status, 200);
    const otra = await reservar(otroCliente, { barberoId: 2, servicioId: 1, inicio: turno.inicio });
    assert.equal(otra.status, 201);
  });
});

describe("reportes", () => {
  test("solo el administrador consulta los indicadores", async () => {
    assert.equal((await api.get("/api/v1/reportes/resumen").set("Authorization", cliente)).status, 403);
    const r = await api.get(`/api/v1/reportes/resumen?fecha=${fechaCorta(diaHabil())}`).set("Authorization", admin);
    assert.equal(r.status, 200);
    assert.ok(r.body.totalTurnos >= 3);
    assert.equal(r.body.porHora.length, 10);
    assert.equal(r.body.porBarbero.length, 4);
  });
});
