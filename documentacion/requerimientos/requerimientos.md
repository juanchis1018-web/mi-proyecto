# Requerimientos de CorteYa

Requerimientos del producto mínimo viable, tomados del documento maestro del proyecto y ajustados a la implementación. La columna **Estado** indica si el requerimiento está implementado en la versión final.

## Actores

| Actor | Descripción |
|---|---|
| Cliente | Persona que reserva y gestiona sus turnos desde el celular o el computador. |
| Barbero | Integrante del equipo; consulta su agenda y registra si atendió cada turno. |
| Administrador (dueño) | Configura el catálogo, el equipo y consulta los indicadores del negocio. |
| Visitante | Persona sin sesión: consulta servicios, precios, barberos y disponibilidad. |

## Requerimientos funcionales

| ID | Requerimiento | Actor | Estado |
|---|---|---|---|
| RF-01 | Registrarse con nombre, correo, celular y contraseña, e iniciar sesión con correo y contraseña. | Todos | Implementado |
| RF-02 | Consultar el catálogo de servicios activos con precio y duración, filtrar por categoría y buscar por nombre. | Visitante | Implementado |
| RF-03 | Consultar el equipo de barberos y el próximo espacio libre de cada uno. | Visitante | Implementado |
| RF-04 | Calcular las franjas libres de un barbero para un servicio en los próximos 7 días, considerando horario del negocio, almuerzo del barbero y turnos ya asignados. | Visitante | Implementado |
| RF-05 | Reservar un turno y rechazar cualquier reserva que se solape con otro turno del mismo barbero, incluso si dos personas reservan al mismo tiempo. | Cliente, Admin | Implementado |
| RF-06 | Consultar mis turnos próximos y mi historial. | Cliente | Implementado |
| RF-07 | Cancelar un turno propio hasta dos horas antes de su inicio. | Cliente | Implementado |
| RF-08 | Consultar la agenda de un día, filtrar por barbero, estado o cliente. | Barbero, Admin | Implementado |
| RF-09 | Cambiar el estado de un turno: confirmar, cancelar, atendido, no asistió, según la máquina de estados. | Barbero, Admin | Implementado |
| RF-10 | Registrar turnos de clientes que llaman o llegan al local. | Admin | Implementado |
| RF-11 | Crear, editar y desactivar servicios (nombre, categoría, duración, precio, descripción). | Admin | Implementado |
| RF-12 | Crear, editar y desactivar barberos (especialidad, experiencia, servicios que presta, almuerzo). | Admin | Implementado |
| RF-13 | Consultar indicadores del día: turnos, cancelados, ocupación, inasistencias, ingresos reales y proyectados, turnos por hora y ocupación por barbero. | Admin | Implementado |
| RF-14 | Enviar recordatorios por correo o WhatsApp. | Sistema | Pendiente (mejora futura) |
| RF-15 | Inicio de sesión con Google (OAuth 2.1). | Todos | Pendiente (mejora futura) |

## Requerimientos no funcionales

| ID | Atributo | Requerimiento | Cómo se cumple |
|---|---|---|---|
| RNF-01 | Seguridad | Contraseñas cifradas, sesiones con token firmado, control de acceso por rol y por propiedad del recurso. | bcrypt, JWT con expiración, middlewares `autenticar` y `autorizar`, verificación de dueño del turno. |
| RNF-02 | Seguridad | Prevención de inyección SQL, XSS y CSRF. | Sequelize con consultas parametrizadas, `express-validator`, DOM construido con `textContent`, Helmet con CSP, token en cabecera `Authorization` (no en cookies). |
| RNF-03 | Integridad | Ningún barbero puede tener dos turnos activos solapados. | Validación con `shared/agenda.js` dentro de una transacción que bloquea al barbero. |
| RNF-04 | Usabilidad | Reservar en máximo cuatro pasos desde un celular. | Formulario por pasos con resumen tipo ticket. |
| RNF-05 | Responsive | La interfaz se adapta a computador, tableta y celular. | CSS Grid, Flexbox y media queries en 1020, 960 y 600 px. |
| RNF-06 | Accesibilidad | Navegación por teclado, etiquetas en formularios, mensajes de error asociados a los campos. | `label`, `aria-invalid`, `aria-describedby`, `aria-live`, foco visible, enlace para saltar al contenido. |
| RNF-07 | Mantenibilidad | Código organizado por capas y módulos, reglas de negocio en un solo lugar y pruebas automatizadas. | Carpetas `frontend/src`, `backend/src` y `shared`; pruebas con `node:test`. |
| RNF-08 | Rendimiento | La consulta de disponibilidad responde en menos de 500 ms con datos de una barbería. | Consulta indexada por barbero y fecha; cálculo en memoria de máximo 14 días. |
| RNF-09 | Portabilidad | Ejecutable con un solo comando y sin instalar base de datos en desarrollo. | SQLite en desarrollo, PostgreSQL en producción, Docker Compose opcional. |

## Reglas de negocio

1. La barbería atiende de lunes a sábado, de 9:00 a. m. a 7:00 p. m.; la agenda se organiza en bloques de 30 minutos.
2. Cada barbero tiene una hora de almuerzo en la que no se asignan turnos.
3. Un turno ocupa la duración completa del servicio y no puede cruzar el almuerzo ni el cierre.
4. Dos turnos activos de un mismo barbero no se pueden solapar. Los turnos cancelados liberan la franja.
5. Solo se reserva desde la siguiente franja futura y hasta 14 días adelante.
6. El cliente puede cancelar hasta 2 horas antes; después, solo el negocio puede cambiar el estado.
7. Estados del turno: `PENDIENTE → CONFIRMADO → ATENDIDO | NO_ASISTIO`, y `PENDIENTE | CONFIRMADO → CANCELADO`. Atendido y no asistió solo se marcan cuando el turno ya empezó.
8. El precio del turno se guarda al reservar, para que un cambio posterior de precio no altere el histórico.
9. Servicios y barberos se desactivan (borrado lógico), nunca se eliminan, para conservar el historial.
