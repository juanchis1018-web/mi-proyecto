# Decisiones técnicas

Registro de las decisiones de arquitectura más importantes, con su contexto y sus consecuencias.

## DT-01. Monolito modular con API REST

- **Contexto:** equipo de tres personas, un semestre y un producto para una sola barbería por instalación.
- **Decisión:** un solo servidor Express que expone la API REST y sirve el frontend, organizado en capas (rutas, controladores, servicios, modelos).
- **Alternativas descartadas:** microservicios, que agregan complejidad operativa sin beneficio a esta escala.
- **Consecuencias:** se despliega como un solo servicio. Por la separación en capas, se podría extraer un módulo (por ejemplo, notificaciones) si el producto crece.

## DT-02. JavaScript con módulos ES en lugar de React

- **Contexto:** la Fase I se construyó con HTML, CSS y JavaScript. El documento maestro mencionaba React.
- **Decisión:** evolucionar el mismo código hacia una SPA modular con módulos ES nativos, un enrutador propio y componentes como funciones.
- **Motivo:** conserva la trazabilidad desde la Fase I, no necesita compilación (`npm start` y listo) y obliga a aplicar los fundamentos (DOM, eventos, estado, accesibilidad).
- **Consecuencias:** sin JSX ni estado reactivo; cada página vuelve a pintar su sección cuando cambian los datos. Para el tamaño del producto es suficiente.

## DT-03. Reglas de negocio compartidas en `shared/`

- **Contexto:** el frontend necesita calcular franjas en el modo demostración y el backend debe validar las reservas.
- **Decisión:** escribir las reglas como funciones puras en módulos ES que importan los dos lados.
- **Consecuencias:** la regla de no solapamiento existe en un solo lugar y se prueba una vez (`tests/shared`). Por eso el backend también usa módulos ES (`"type": "module"`).

## DT-04. SQLite en desarrollo, PostgreSQL en producción

- **Decisión:** Sequelize con SQLite por defecto y PostgreSQL cuando existe `DATABASE_URL`.
- **Motivo:** cualquiera puede ejecutar el proyecto sin instalar una base de datos. Las mismas pruebas pasaron con SQLite y con PostgreSQL 16.
- **Consecuencias:** las tablas se crean con `sequelize.sync()`. En una evolución del producto se pasaría a migraciones versionadas.

## DT-05. Consistencia de las reservas

- **Problema:** dos clientes pueden intentar reservar la misma franja al mismo tiempo.
- **Decisión:** la reserva se procesa en tres capas. Primero entra a una cola por barbero dentro del proceso. Luego abre una transacción que bloquea la fila del barbero (`SELECT … FOR UPDATE` en PostgreSQL). Por último, valida de nuevo con `validarReserva()` antes de insertar.
- **Evidencia:** la prueba "de cinco reservas simultáneas para la misma franja solo una se acepta" responde `[201, 409, 409, 409, 409]`.

## DT-06. JWT en la cabecera Authorization

- **Decisión:** token de acceso firmado con HS256 y expiración configurable (8 horas por defecto). Se envía en `Authorization: Bearer` y se guarda en el navegador.
- **Motivo:** al no usar cookies, la API no es vulnerable a CSRF y la autenticación queda sin estado (permite varias réplicas).
- **Riesgo aceptado:** un token robado por XSS sería usable hasta que expire. Se mitiga con la CSP estricta y la construcción segura del DOM. El inicio de sesión con Google (OAuth 2.1) y los tokens de renovación quedan como mejora futura.

## DT-07. Modo demostración en el navegador

- **Contexto:** GitHub Pages solo publica archivos estáticos.
- **Decisión:** `demoApi.js` implementa la misma interfaz que la API con `localStorage` y las mismas reglas y permisos. `datos.js` elige automáticamente la fuente según si `/api/v1/salud` responde.
- **Consecuencias:** el producto publicado es usable sin servidor, y una franja amarilla avisa que los datos son locales.

## DT-08. Borrado lógico

- **Decisión:** servicios y barberos se desactivan (`activo = false`) en lugar de eliminarse.
- **Motivo:** los turnos históricos deben conservar su servicio y su barbero, y los reportes deben seguir siendo correctos.

## DT-09. Pruebas con `node:test`

- **Decisión:** el ejecutor de pruebas nativo de Node.js con `supertest` para la API.
- **Motivo:** no requiere configuración extra y ejecuta igual pruebas de módulos ES del frontend, del código compartido y del backend.

## DT-10. Flujo de trabajo con GitFlow y commits convencionales

- **Decisión:** ramas `main` (entregas), `develop` (integración) y `feature/*`. Mensajes con prefijos `feat`, `fix`, `refactor`, `test`, `docs`, `build` y `ci`. Etiquetas por fase: `v1.0.0-fase1`, `v2.0.0-fase2` y `v3.0.0-final`.
