# Guía para la socialización y auditoría

Guion de 12 a 15 minutos para presentar CorteYa y preparar las preguntas de la auditoría. Cada integrante debe poder explicar todo el proyecto, pero cada uno lidera una parte.

## Preparación (antes de entrar)

1. `npm install`, `npm run seed` y `npm start`. Comprobar que `http://localhost:3000` abre **sin** la franja amarilla (es decir, conectado a la API).
2. Tener abiertas tres pestañas: la aplicación, `http://localhost:3000/api/docs` y el repositorio en GitHub.
3. Tener una terminal lista para `npm test`.
4. Plan B si falla el servidor: la versión de GitHub Pages (modo demostración).

## Guion

| Min. | Quién | Qué mostrar |
|---|---|---|
| 0 a 2 | Santiago | Problema: barberías que agendan por WhatsApp y cuaderno, con turnos cruzados e inasistencias. Objetivo y alcance. |
| 2 a 6 | Isaac | Demo como **cliente**: inicio con el tablero de turnos libres, búsqueda, registro con validaciones, reserva en 4 pasos, ticket, Mis turnos y cancelación. Mostrar el celular (herramientas de desarrollador, 390 px). |
| 6 a 8 | Isaac | Demo como **barbero**: agenda del día, cambio de estado. |
| 8 a 10 | Juan Sebastián | Demo como **dueño**: panel con indicadores, registrar turno de mostrador, CRUD de servicios (mostrar la validación de 45 minutos) y de barberos. |
| 10 a 12 | Santiago | Arquitectura (diagrama `01_arquitectura.png`), API en Swagger: probar `POST /auth/login` y `GET /turnos` con **Authorize**. Modelo entidad-relación. |
| 12 a 14 | Juan Sebastián | Calidad: `npm test` (70 pruebas), prueba de reservas simultáneas, seguridad OWASP, GitHub Actions y GitHub Pages. |
| 14 a 15 | Todos | Evolución: etiquetas `v1.0.0-fase1`, `v2.0.0-fase2` y `v3.0.0-final`, limitaciones y mejoras futuras. |

## Preguntas probables y respuestas cortas

**¿Cómo evitan que dos personas reserven la misma hora?**
Las franjas se calculan con `franjasDisponibles()` en `shared/agenda.js`. Al reservar, el `AgendaService` pone la petición en una cola por barbero, abre una transacción que bloquea la fila del barbero y vuelve a validar con `validarReserva()`. Si la franja ya está ocupada responde 409. Hay una prueba que envía cinco reservas simultáneas y solo una se acepta.

**¿Cuándo se solapan dos turnos?**
Cuando cada uno empieza antes de que termine el otro: `aInicio < bFin && bInicio < aFin`. Por eso un turno de 10:00 a 11:00 bloquea las 10:30, pero no las 11:00.

**¿Cómo funciona el inicio de sesión?**
El backend compara la contraseña con su hash bcrypt. Si es correcta, firma un JWT con el id y el rol (HS256, 8 horas). El frontend lo guarda y lo envía en la cabecera `Authorization: Bearer`. El middleware `autenticar` lo verifica en cada petición y `autorizar` revisa el rol.

**¿Qué pasa si alguien modifica el rol dentro del token?**
La firma deja de coincidir y la API responde 401. Hay una prueba para eso.

**¿Cómo previenen la inyección SQL?**
Todo el acceso a datos pasa por Sequelize, que usa consultas parametrizadas, y las entradas se validan con express-validator antes de llegar a los servicios.

**¿Y XSS?**
El frontend nunca usa `innerHTML` con datos: la función `crear()` asigna el texto con `textContent`. Además, Helmet envía una CSP que solo permite scripts del mismo origen.

**¿Y CSRF?**
El token va en una cabecera y no en una cookie, así que un sitio externo no puede enviarlo automáticamente.

**¿Por qué un cliente recibe 404 y no 403 al tocar un turno ajeno?**
Para no revelar que ese turno existe (OWASP API1, autorización a nivel de objeto).

**¿Qué es el modo demostración?**
Cuando no hay backend (GitHub Pages), `services/datos.js` usa `demoApi.js`, que implementa la misma interfaz con `localStorage` y las mismas reglas de `shared/`. Las páginas no saben de dónde vienen los datos.

**¿Por qué no usaron React?**
Para evolucionar el mismo código desde la Fase I sin paso de compilación y aplicar los fundamentos. La arquitectura igual está separada en componentes, páginas, servicios y utilidades (ver `decisiones.md`, DT-02).

**¿Por qué SQLite y PostgreSQL?**
SQLite permite ejecutar el proyecto sin instalar nada. En producción se define `DATABASE_URL` y se usa PostgreSQL; las pruebas pasaron con ambos.

**¿Qué falta?**
Recordatorios por correo o WhatsApp, inicio de sesión con Google, pagos en línea, migraciones versionadas y soporte para varias sedes.

## Mapa del código para responder rápido

| Tema | Archivo |
|---|---|
| Regla de solapamiento y franjas | `shared/agenda.js` |
| Reserva con transacción | `backend/src/services/agendaService.js`, función `reservar` |
| JWT y bcrypt | `backend/src/services/authService.js` |
| Permisos por rol | `backend/src/middlewares/autenticacion.js` y `routes/index.js` |
| Validaciones de la API | `backend/src/middlewares/validacion.js` |
| Cabeceras de seguridad | `backend/src/app.js` |
| Modelos y relaciones | `backend/src/models/index.js` |
| Fuente de datos del frontend | `frontend/src/services/datos.js` |
| Formulario de reserva | `frontend/src/pages/reservar.js` |
| Pruebas de concurrencia | `tests/backend/turnos.test.js` |
