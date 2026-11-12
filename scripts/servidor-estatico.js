/**
 * Servidor estático mínimo para ejecutar el frontend sin dependencias.
 * Sirve la carpeta frontend/ en la raíz y shared/ en /shared.
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const RAIZ = resolve(import.meta.dirname, "..");
const PUERTO = Number(process.env.PORT) || 3000;
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };

http
  .createServer(async (req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const base = ruta.startsWith("/shared/") ? RAIZ : join(RAIZ, "frontend");
    const archivo = normalize(join(base, ruta === "/" ? "index.html" : ruta));
    if (!archivo.startsWith(RAIZ)) return res.writeHead(403).end();
    try {
      const contenido = await readFile(archivo);
      res.writeHead(200, { "Content-Type": TIPOS[extname(archivo)] || "application/octet-stream" }).end(contenido);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("No encontrado");
    }
  })
  .listen(PUERTO, () => console.log(`CorteYa disponible en http://localhost:${PUERTO}`));
