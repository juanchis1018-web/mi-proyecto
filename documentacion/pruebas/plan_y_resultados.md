# Plan y resultados de pruebas

## Estrategia

| Nivel | Qué se prueba | Herramienta | Ubicación |
|---|---|---|---|
| Unitarias | Reglas de agenda (franjas, solapamiento, almuerzo, cancelación, estados), indicadores y validaciones de formularios | `node:test` | `tests/shared/`, `tests/frontend/` |
| Integración | Endpoints de la API con base de datos real (SQLite en memoria): autenticación, CRUD, reservas, permisos, reportes | `node:test` + `supertest` | `tests/backend/` |
| Seguridad | Inyección SQL, HTML en entradas, token alterado, cabeceras, JSON mal formado, tamaño de petición | `node:test` + `supertest` | `tests/backend/seguridad.test.js` |
| Funcionales (extremo a extremo) | Recorridos completos en el navegador por cada rol, contra la API y en modo demostración | Navegador Chromium automatizado | Evidencias en `evidencias/final/` |
| Responsive | Visualización en 1366 px, 820 px y 390 px sin desplazamiento horizontal | Navegador automatizado | Evidencias `18` a `21` |
| Integración continua | Todas las pruebas automatizadas en Node 20 y 22 en cada push o pull request | GitHub Actions | `.github/workflows/ci.yml` |

Ejecutar las pruebas automatizadas:

```bash
npm test
```

## Resultados de las pruebas automatizadas

**70 pruebas, 70 aprobadas, 0 fallidas.** La salida completa está en [`resultado_pruebas_automatizadas.txt`](resultado_pruebas_automatizadas.txt).

| Archivo | Pruebas | Resultado |
|---|---|---|
| `tests/shared/agenda.test.js` | 21 | Aprobadas |
| `tests/shared/reportes.test.js` | 2 | Aprobadas |
| `tests/frontend/validaciones.test.js` | 6 | Aprobadas |
| `tests/backend/auth.test.js` | 7 | Aprobadas |
| `tests/backend/catalogo.test.js` | 9 | Aprobadas |
| `tests/backend/turnos.test.js` | 16 | Aprobadas |
| `tests/backend/seguridad.test.js` | 9 | Aprobadas |

Las pruebas de la API también se ejecutaron contra **PostgreSQL 16** (`DATABASE_URL=postgres://… npm test`): 41 de 41 aprobadas.

### Casos destacados

- **Reservas simultáneas:** cinco peticiones al mismo tiempo por la misma franja devuelven `[201, 409, 409, 409, 409]`; nunca quedan dos turnos cruzados.
- **Solapamiento parcial:** un turno de 10:00 a 11:00 bloquea una reserva a las 10:30 (`409`).
- **Almuerzo:** un servicio de 60 minutos no se ofrece a las 11:30 si el almuerzo empieza a las 12:00.
- **Propiedad del recurso:** un cliente que intenta cancelar el turno de otro recibe `404`. Un barbero que intenta cambiar el turno de otro barbero recibe `403`.
- **Token alterado:** cambiar el rol dentro del JWT sin la firma correcta devuelve `401`.
- **Inyección SQL:** `' OR '1'='1` en el inicio de sesión responde `401` o `422`, nunca `500` ni acceso.

## Pruebas funcionales (extremo a extremo)

Ejecutadas en Chromium con el servidor real (`npm start`) y repetidas en modo demostración. Resultado: **todas aprobadas, sin errores en la consola del navegador.**

| ID | Caso | Pasos | Resultado esperado | Resultado | Evidencia |
|---|---|---|---|---|---|
| PF-01 | Ver inicio | Abrir `/` | Tablero con el próximo turno libre de cada barbero, catálogo y equipo | Aprobada | `01-inicio-escritorio.png` |
| PF-02 | Buscar y filtrar servicios | Escribir "corte"; elegir "Barba y cejas" | La lista se reduce a los que coinciden | Aprobada | `02-catalogo-busqueda.png` |
| PF-03 | Validar registro | Enviar datos inválidos | Mensaje bajo cada campo inválido; el foco va al primero | Aprobada | `03-registro-validaciones.png` |
| PF-04 | Registrarse | Datos válidos | Cuenta creada, sesión iniciada, redirige a Reservar | Aprobada | — |
| PF-05 | Reservar turno | Servicio, barbero, día y hora, nota, confirmar | Ticket con código y total; aviso de confirmación | Aprobada | `04` a `06` |
| PF-06 | Barbero que no presta el servicio | Elegir "Corte con diseño" | Kevin y Luisa aparecen deshabilitados | Aprobada | `04-reserva-paso2-barbero.png` |
| PF-07 | Mis turnos | Abrir Mis turnos | Turno próximo con estado y botón Cancelar | Aprobada | `07-mis-turnos.png` |
| PF-08 | Cancelar turno | Cancelar y confirmar en el diálogo | El turno pasa al historial como cancelado | Aprobada | `08-cancelar-confirmacion.png` |
| PF-09 | Agenda del barbero | Entrar como barbero | Solo ve sus turnos; puede navegar por días | Aprobada | `09`, `10` |
| PF-10 | Panel del dueño | Entrar como dueño | Indicadores, gráfica, ocupación y agenda con filtros | Aprobada | `11`, `12` |
| PF-11 | Cambiar estado | Marcar un turno como atendido | El estado cambia y se actualizan los indicadores | Aprobada | — |
| PF-12 | Crear servicio con error | Duración 45 | Mensaje "múltiplo de 30 minutos" | Aprobada | `14-admin-servicio-validacion.png` |
| PF-13 | CRUD de servicios | Crear, editar y desactivar | La tabla refleja cada cambio | Aprobada | `13-admin-servicios.png` |
| PF-14 | CRUD de barberos | Editar servicios y almuerzo | Validación de almuerzo invertido; cambios guardados | Aprobada | `15`, `16` |
| PF-15 | Rutas protegidas | Abrir `#/panel` sin sesión | Redirige a Ingresar y vuelve después del login | Aprobada | — |
| PF-16 | Permisos en la interfaz | Cliente abre `#/admin/servicios` | Página "Sin permiso" | Aprobada | — |
| PF-17 | Ruta inexistente | Abrir `#/xyz` | Página "Página no encontrada" | Aprobada | — |
| PF-18 | Documentación de la API | Abrir `/api/docs` | Swagger UI con todos los endpoints | Aprobada | `17-documentacion-api-swagger.png` |
| PF-19 | Responsive | 1366, 820 y 390 px | Sin desplazamiento horizontal; menú desplegable en celular; tabla en tarjetas | Aprobada | `18` a `21` |
| PF-20 | Modo demostración | Abrir el frontend sin backend | Franja de aviso; todas las funciones operan en el navegador | Aprobada | `22-modo-demostracion-pages.png` |
| PF-21 | Sin conexión con la API | Detener el servidor y reintentar una acción | Mensaje "No hay conexión con el servidor…" | Aprobada | — |

## Pruebas de la Fase I

Las capturas del prototipo inicial se conservan en [`evidencias/fase1/`](evidencias/fase1/) como evidencia de la evolución del proyecto.

## Limitaciones conocidas

- La interfaz calcula y muestra las horas en la zona horaria del navegador. Está pensada para usuarios en Colombia; un navegador en otra zona horaria vería las horas desplazadas.
- En el modo demostración los datos viven en un solo navegador y se regeneran cada día.
- El `Dockerfile` y el `docker-compose.yml` se incluyen para el despliegue, pero las pruebas documentadas aquí se ejecutaron con Node.js directamente (SQLite y PostgreSQL 16).
