/**
 * Aplicación Express: seguridad, API REST, documentación OpenAPI, métricas
 * y archivos estáticos del frontend.
 */
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";
import swaggerUi from "swagger-ui-express";
import client from "prom-client";
import { config } from "./config/index.js";
import api from "./routes/index.js";
import { rutaNoEncontrada, manejarErrores } from "./middlewares/errores.js";

/* Métricas para Prometheus --------------------------------------------------- */
const registro = new client.Registry();
client.collectDefaultMetrics({ register: registro });
const duracionPeticiones = new client.Histogram({
  name: "corteya_http_duracion_segundos",
  help: "Duración de las peticiones HTTP a la API",
  labelNames: ["metodo", "ruta", "status"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
  registers: [registro],
});

export function crearApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  // Documentación interactiva (necesita su propia política de contenido)
  const especificacion = YAML.parse(readFileSync(join(import.meta.dirname, "docs/openapi.yaml"), "utf8"));
  app.use("/api/docs", helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(especificacion, { customSiteTitle: "CorteYa API" }));
  app.get("/api/openapi.json", (_req, res) => res.json(especificacion));

  // Cabeceras de seguridad: CSP estricta (sin scripts en línea), HSTS, nosniff, etc.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.esProduccion ? [] : null,
        },
      },
    })
  );

  // CORS: por defecto solo el mismo origen; en producción se pueden autorizar dominios
  app.use("/api", cors({ origin: config.corsOrigenes.length ? config.corsOrigenes : false }));
  app.use(express.json({ limit: "20kb" }));

  app.use("/api", (req, res, next) => {
    const fin = duracionPeticiones.startTimer({ metodo: req.method });
    res.on("finish", () => fin({ ruta: req.route ? req.baseUrl + req.route.path : "desconocida", status: res.statusCode }));
    next();
  });

  app.use("/api/v1", api);
  app.get("/metrics", async (_req, res) => {
    res.set("Content-Type", registro.contentType);
    res.end(await registro.metrics());
  });
  app.use("/api", rutaNoEncontrada);

  // Frontend y reglas compartidas como archivos estáticos
  app.use("/shared", express.static(join(config.raiz, "shared"), { maxAge: config.esProduccion ? "1h" : 0 }));
  app.use(express.static(join(config.raiz, "frontend"), { maxAge: config.esProduccion ? "1h" : 0 }));

  app.use(manejarErrores);
  return app;
}
