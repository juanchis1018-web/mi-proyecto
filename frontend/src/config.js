/**
 * Configuración del frontend.
 *
 * API_URL: dirección de la API REST. Por defecto es la misma del sitio (/api/v1),
 * que es como funciona cuando el backend sirve el frontend. Para un frontend
 * publicado aparte (por ejemplo en GitHub Pages) con el backend en otro dominio,
 * se define en index.html: <meta name="corteya-api" content="https://mi-api.com/api/v1">
 *
 * MODO: "auto" usa la API si responde y, si no, el modo demostración.
 * Se puede forzar con <meta name="corteya-modo" content="demo"> o "api".
 */
const meta = (nombre) => document.querySelector(`meta[name="${nombre}"]`)?.content?.trim();

export const API_URL = (meta("corteya-api") || "/api/v1").replace(/\/$/, "");
export const MODO = meta("corteya-modo") || "auto";
