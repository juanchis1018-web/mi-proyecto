/** Pruebas de integración: CRUD de servicios y barberos con control de acceso. */
import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import { prepararApp, token, cuentas, sequelize } from "./preparacion.js";

let api, admin, cliente;
before(async () => {
  api = await prepararApp();
  admin = await token(api, ...cuentas.admin);
  cliente = await token(api, ...cuentas.cliente);
});
after(() => sequelize.close());

const servicioNuevo = { nombre: "Mascarilla negra", categoria: "barba", duracionMin: 30, precio: 15000, descripcion: "Limpieza facial." };

describe("servicios", () => {
  test("cualquiera puede ver el catálogo activo", async () => {
    const r = await api.get("/api/v1/servicios");
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 8);
    assert.ok(r.body.every((s) => s.activo));
  });

  test("crear exige sesión (401) y rol administrador (403)", async () => {
    assert.equal((await api.post("/api/v1/servicios").send(servicioNuevo)).status, 401);
    assert.equal((await api.post("/api/v1/servicios").set("Authorization", cliente).send(servicioNuevo)).status, 403);
  });

  test("valida duración múltiplo de 30, categoría y precio", async () => {
    const r = await api.post("/api/v1/servicios").set("Authorization", admin).send({ ...servicioNuevo, duracionMin: 45, categoria: "otra", precio: -5 });
    assert.equal(r.status, 422);
    assert.deepEqual(r.body.error.detalles.map((d) => d.campo).sort(), ["categoria", "duracionMin", "precio"]);
  });

  test("crea, actualiza y desactiva un servicio", async () => {
    const creado = await api.post("/api/v1/servicios").set("Authorization", admin).send(servicioNuevo);
    assert.equal(creado.status, 201);
    const id = creado.body.id;

    const editado = await api.put(`/api/v1/servicios/${id}`).set("Authorization", admin).send({ precio: 17000 });
    assert.equal(editado.status, 200);
    assert.equal(editado.body.precio, 17000);
    assert.equal(editado.body.nombre, servicioNuevo.nombre, "la actualización es parcial");

    const borrado = await api.delete(`/api/v1/servicios/${id}`).set("Authorization", admin);
    assert.equal(borrado.body.activo, false);

    const publico = await api.get("/api/v1/servicios");
    assert.ok(!publico.body.some((s) => s.id === id), "no aparece en el catálogo público");
    const todos = await api.get("/api/v1/servicios?todos=true").set("Authorization", admin);
    assert.ok(todos.body.some((s) => s.id === id), "el administrador sí lo ve");
    const todosCliente = await api.get("/api/v1/servicios?todos=true").set("Authorization", cliente);
    assert.ok(!todosCliente.body.some((s) => s.id === id), "un cliente no puede ver los desactivados");
  });

  test("404 para un servicio inexistente y 422 para un id inválido", async () => {
    assert.equal((await api.put("/api/v1/servicios/999").set("Authorization", admin).send({ precio: 20000 })).status, 404);
    assert.equal((await api.get("/api/v1/servicios/abc")).status, 422);
  });
});

describe("barberos", () => {
  const barberoNuevo = { nombre: "Mateo Ríos", especialidad: "Cortes clásicos", experiencia: 3, servicios: [1, 4], almuerzoInicio: "12:00", almuerzoFin: "13:00" };

  test("lista los barberos con los servicios que prestan", async () => {
    const r = await api.get("/api/v1/barberos");
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 4);
    assert.deepEqual(r.body[0].servicios, [1, 2, 3, 6, 7, 8]);
  });

  test("rechaza servicios inexistentes y almuerzo invertido", async () => {
    const r1 = await api.post("/api/v1/barberos").set("Authorization", admin).send({ ...barberoNuevo, servicios: [1, 999] });
    assert.equal(r1.status, 422);
    assert.equal(r1.body.error.detalles[0].campo, "servicios");
    const r2 = await api.post("/api/v1/barberos").set("Authorization", admin).send({ ...barberoNuevo, almuerzoInicio: "14:00", almuerzoFin: "13:00" });
    assert.equal(r2.status, 422);
    assert.equal(r2.body.error.detalles[0].campo, "almuerzoFin");
  });

  test("crea, edita servicios y desactiva un barbero", async () => {
    const creado = await api.post("/api/v1/barberos").set("Authorization", admin).send(barberoNuevo);
    assert.equal(creado.status, 201);
    assert.deepEqual(creado.body.servicios, [1, 4]);

    const editado = await api.put(`/api/v1/barberos/${creado.body.id}`).set("Authorization", admin).send({ servicios: [1, 4, 6] });
    assert.deepEqual(editado.body.servicios, [1, 4, 6]);

    await api.delete(`/api/v1/barberos/${creado.body.id}`).set("Authorization", admin);
    const publico = await api.get("/api/v1/barberos");
    assert.ok(!publico.body.some((b) => b.id === creado.body.id));
  });

  test("un barbero no puede administrar el catálogo", async () => {
    const barbero = await token(api, ...cuentas.andres);
    assert.equal((await api.post("/api/v1/barberos").set("Authorization", barbero).send(barberoNuevo)).status, 403);
  });
});
