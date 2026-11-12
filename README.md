# CorteYa

Plataforma web de gestión de turnos para barberías pyme en Colombia.

> Estado: **Fase II**. Producto web modular con gestión de usuarios por rol, reservas, panel y administración del catálogo. Los datos se gestionan en el navegador; la integración con la API REST está prevista para la entrega final.

## Problemática

La mayoría de las barberías pequeñas toma las citas por llamada, por WhatsApp o en un cuaderno. Eso provoca turnos cruzados, espacios vacíos que nadie sabía que estaban libres, inasistencias sin recordatorio y ninguna información confiable para tomar decisiones.

## Objetivo

Construir una plataforma web que permita a una barbería pyme gestionar sus turnos de forma centralizada y confiable, evitando cruces de horario, reduciendo inasistencias y entregando indicadores para la toma de decisiones.

## Alcance de la Fase II

- Navegación entre páginas con rutas (`#/inicio`, `#/reservar`, `#/mis-turnos`, `#/panel`, `#/admin/servicios`, `#/admin/barberos`, `#/ingresar`, `#/registro`).
- Gestión de usuarios: registro, inicio de sesión y permisos por rol (cliente, barbero y administrador).
- Reserva por pasos que solo ofrece horas libres y valida los datos.
- Mis turnos con historial y cancelación.
- Panel del dueño con indicadores, gráfica y agenda con filtros y búsqueda.
- Administración del catálogo de servicios y del equipo de barberos (crear, editar, desactivar).
- Pruebas automatizadas de las reglas de negocio y de las validaciones.

## Tecnologías

- HTML5, CSS3 (variables, Grid, Flexbox, media queries) y JavaScript con módulos ES.
- Node.js 20 o superior para el servidor de desarrollo y las pruebas (`node:test`).
- Git y GitHub con GitFlow y commits convencionales.

## Arquitectura del frontend

```
frontend/src
├── main.js          Arranque y definición de rutas
├── router.js        Enrutador por hash con control de acceso por rol
├── components/      Piezas reutilizables (formularios, diálogos, tarjetas, avisos)
├── pages/           Una página por ruta
├── services/        Acceso a datos y sesión
└── utils/           Formatos y validaciones
shared/              Reglas de negocio compartidas (agenda, reportes, datos iniciales)
```

Las páginas nunca acceden directamente al almacenamiento: usan `services/datos.js`, que en esta fase delega en `demoApi.js`. Esa capa expone la misma interfaz que tendrá la API REST, de modo que en la siguiente fase solo cambia la fuente de datos.

## Instalación y ejecución

Requisitos: Node.js 20 o superior.

```bash
git clone https://github.com/guachulol0345896-pixel/CorteYa.git
cd CorteYa
npm start          # abre http://localhost:3000
npm test           # ejecuta las pruebas
```

Cuentas de demostración: `cliente@corteya.co / Cliente123*`, `andres@corteya.co / Barbero123*`, `admin@corteya.co / Admin123*`.

## Estado

**Implementado en la Fase II:** reorganización del código por componentes y páginas, enrutador, sesión y roles, CRUD de servicios y barberos, búsqueda y filtros, panel con selector de fecha, validaciones con mensajes por campo, diálogos accesibles y pruebas automatizadas.

**Pendiente:** backend con API REST, base de datos, autenticación con JWT, despliegue.

**Próximos pasos:** construir la API con Node.js, Express y Sequelize; conectar el frontend; publicar el producto.

## Equipo

- Santiago Rios Duque
- Isaac Stiven Nuñez Melo
- Juan Sebastian Muñoz Melo
