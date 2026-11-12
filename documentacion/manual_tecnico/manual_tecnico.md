# Manual técnico de CorteYa

## 1. Requisitos

| Componente | Versión |
|---|---|
| Node.js | 20 o superior (probado en 22) |
| npm | 10 o superior |
| Base de datos | Ninguna en desarrollo (SQLite incluido). PostgreSQL 14+ opcional para producción. |
| Navegador | Chrome, Edge, Firefox o Safari actualizados |
| Opcional | Docker y Docker Compose |

## 2. Instalación y ejecución local

```bash
git clone https://github.com/guachulol0345896-pixel/CorteYa.git
cd CorteYa
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm start
```

- Aplicación: <http://localhost:3000>
- Documentación de la API: <http://localhost:3000/api/docs>
- Salud: <http://localhost:3000/api/v1/salud>
- Métricas: <http://localhost:3000/metrics>

La primera vez se crea `datos/corteya.sqlite` con los datos de demostración. Para reiniciar la base de datos con turnos de la semana actual:

```bash
npm run seed
```

Otros comandos:

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor que se reinicia al guardar cambios |
| `npm test` | Pruebas unitarias, de integración y de seguridad |
| `npm run start:estatico` | Solo el frontend, sin backend (modo demostración) |

## 3. Configuración (variables de entorno)

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `PORT` | `3000` | Puerto HTTP |
| `NODE_ENV` | `development` | `production` activa caché, HSTS y exige `JWT_SECRET` |
| `TZ` | `America/Bogota` | Zona horaria de la agenda |
| `JWT_SECRET` | clave de desarrollo | **Obligatoria en producción.** Cadena larga y aleatoria |
| `JWT_EXPIRA` | `8h` | Vigencia del token |
| `DB_STORAGE` | `./datos/corteya.sqlite` | Archivo SQLite |
| `DATABASE_URL` | vacío | Si tiene valor, se usa PostgreSQL |
| `DB_SSL` | `false` | SSL para PostgreSQL gestionado |
| `SEMBRAR_DATOS` | `true` | Carga datos de demostración si la base está vacía |
| `CORS_ORIGENES` | vacío | Dominios autorizados a consumir la API desde otro origen |

El archivo `.env` está en `.gitignore`: **no se sube al repositorio.** Las contraseñas de las cuentas de demostración son públicas a propósito y solo existen en los datos de ejemplo.

## 4. Estructura del proyecto

```
CorteYa/
├── backend/src/
│   ├── app.js              Express: Helmet, CORS, métricas, Swagger, estáticos
│   ├── server.js           Arranque: conexión, sync, datos iniciales, escucha
│   ├── config/             Variables de entorno
│   ├── db/                 Conexión Sequelize y carga de datos (sembrar.js)
│   ├── models/             Usuario, Barbero, Servicio, BarberoServicio, Turno
│   ├── services/           Auth, Catálogo, Agenda, Reportes
│   ├── controllers/        Adaptadores HTTP
│   ├── routes/             Endpoints /api/v1
│   ├── middlewares/        Autenticación, validación, errores
│   ├── utils/              ErrorHttp y utilidades
│   └── docs/openapi.yaml   Contrato de la API
├── frontend/
│   ├── index.html
│   ├── css/                base, layout, components, pages
│   ├── assets/             Logo y fuentes (licencia OFL)
│   └── src/
│       ├── main.js, router.js, config.js
│       ├── components/     dom, formulario, dialogo, tarjetas, encabezado, aviso
│       ├── pages/          inicio, reservar, misTurnos, panel, adminServicios, adminBarberos, ingresar, registro, errores
│       ├── services/       datos (fachada), api (REST), demoApi (navegador), sesion, errores
│       └── utils/          formato, validaciones
├── shared/                 negocio, agenda, reportes, datosIniciales
├── tests/                  shared, frontend, backend
├── documentacion/          arquitectura, diagramas, requerimientos, pruebas, manuales, decisiones, sustentación
├── scripts/                servidor estático del modo demostración
├── .github/workflows/      ci.yml y pages.yml
├── Dockerfile, docker-compose.yml, render.yaml
└── package.json
```

> **Rutas de `shared/`:** en el navegador, `shared/` se publica junto al frontend (en `/shared`). Por eso los archivos de `frontend/src` la importan como `../../shared/…`, una ruta que funciona en el servidor Express, en el servidor estático y en GitHub Pages (subcarpeta `/CorteYa/`). Abre siempre la aplicación con `npm start` o `npm run start:estatico`, no haciendo doble clic en `index.html`.

## 5. Dependencias

| Paquete | Uso |
|---|---|
| express | Servidor HTTP y enrutamiento |
| sequelize, sqlite3, pg, pg-hstore | ORM y controladores de base de datos |
| bcryptjs | Cifrado de contraseñas |
| jsonwebtoken | Emisión y verificación de tokens |
| helmet | Cabeceras de seguridad y CSP |
| cors | Control de orígenes |
| express-rate-limit | Límite de intentos de inicio de sesión |
| express-validator | Validación y saneamiento de entradas |
| swagger-ui-express, yaml | Documentación interactiva OpenAPI |
| prom-client | Métricas para Prometheus |
| dotenv | Variables de entorno desde `.env` |
| supertest (desarrollo) | Pruebas de integración HTTP |

El frontend no tiene dependencias: usa módulos ES nativos del navegador. `package.json` fuerza `uuid` 11.1.1 o superior (`overrides`) para corregir una alerta de seguridad de una dependencia de Sequelize; `npm audit` reporta 0 vulnerabilidades.

## 6. API REST

Base: `/api/v1`. Contrato completo en `/api/docs` y en `backend/src/docs/openapi.yaml`.

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/salud` | Público |
| POST | `/auth/registro`, `/auth/login` | Público (con límite de intentos) |
| GET | `/auth/yo` | Autenticado |
| GET | `/servicios`, `/servicios/:id` | Público (`?todos=true` solo admin) |
| POST, PUT, DELETE | `/servicios`, `/servicios/:id` | Admin |
| GET | `/barberos`, `/barberos/:id`, `/barberos/proximos-libres` | Público |
| GET | `/barberos/:id/disponibilidad?servicioId=&desde=&dias=` | Público |
| POST, PUT, DELETE | `/barberos`, `/barberos/:id` | Admin |
| GET | `/turnos?fecha=&barberoId=&estado=` | Autenticado (según rol) |
| POST | `/turnos` | Cliente, Admin |
| PATCH | `/turnos/:id/estado` | Cliente (solo cancelar), Barbero (su agenda), Admin |
| GET | `/reportes/resumen?fecha=` | Admin |

Códigos usados: 200, 201, 400 (regla de negocio), 401, 403, 404, 409 (franja ocupada o duplicado), 413, 422 (validación), 429 y 500.

Ejemplo:

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"cliente@corteya.co","password":"Cliente123*"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")
curl -s "localhost:3000/api/v1/barberos/1/disponibilidad?servicioId=1&dias=1"
curl -s -X POST localhost:3000/api/v1/turnos -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"barberoId":1,"servicioId":1,"inicio":"2026-11-13T14:00:00.000Z"}'
```

## 7. Despliegue

### GitHub Pages (frontend en modo demostración)

1. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Cada push a `main` ejecuta `.github/workflows/pages.yml`: corre las pruebas y, si pasan, publica `frontend/` y `shared/`.
3. Dirección: `https://guachulol0345896-pixel.github.io/CorteYa/`.

### Producto completo en Render

1. Crear cuenta en <https://render.com> y elegir **New → Blueprint** con este repositorio (usa `render.yaml`).
2. Render genera `JWT_SECRET`. Para datos permanentes, crear una base PostgreSQL y definir `DATABASE_URL`.

### Docker

```bash
docker compose up --build      # app en http://localhost:3000 con PostgreSQL
```

### Frontend separado del backend

Si el frontend se publica en un dominio distinto al de la API, agregar en `frontend/index.html`:

```html
<meta name="corteya-api" content="https://mi-api.onrender.com/api/v1">
```

y en el backend `CORS_ORIGENES=https://mi-frontend.com`. Para que la CSP del frontend permita la conexión, la API debe estar en HTTPS.

## 8. Pruebas

```bash
npm test                                                   # SQLite en memoria
DATABASE_URL=postgres://usuario:clave@localhost:5432/corteya_test npm test   # PostgreSQL
```

Detalle y resultados en `documentacion/pruebas/plan_y_resultados.md`.

## 9. Solución de problemas

| Síntoma | Causa y solución |
|---|---|
| `npm install` falla en `sqlite3` | Actualiza Node.js a la versión LTS. En Windows, ejecuta la consola como usuario normal y reintenta. |
| La agenda de hoy está vacía o es vieja | Los turnos simulados se generan para la semana en que se creó la base: ejecuta `npm run seed`. |
| Aparece la franja de modo demostración con el servidor encendido | El frontend no alcanzó `/api/v1/salud`. Abre la app desde `http://localhost:3000` y no desde el archivo HTML. |
| `Falta la variable de entorno JWT_SECRET` | En producción es obligatoria: defínela en el entorno. |
| Error 429 al iniciar sesión | Demasiados intentos; espera 15 minutos o reinicia el servidor en desarrollo. |
