/**
 * Enrutador por hash (#/ruta). Cada ruta apunta a un módulo de página con
 * render(contenedor, params). Las rutas protegidas indican los roles permitidos.
 */
import * as sesion from "./services/sesion.js";
import { avisar } from "./components/aviso.js";

const rutas = [];
let contenedor;
let limpiarPaginaAnterior = null;

export function definir(patron, pagina, { roles = null } = {}) {
  const claves = [];
  const regex =
    patron === "*" ? /(?!)/ : new RegExp("^" + patron.replace(/:(\w+)/g, (_, k) => (claves.push(k), "([^/]+)")) + "$");
  rutas.push({ patron, regex, claves, pagina, roles });
}

export function ir(ruta) {
  if (location.hash === `#${ruta}`) resolver();
  else location.hash = ruta;
}

export function rutaActual() {
  return (location.hash.replace(/^#/, "") || "/").split("?")[0];
}

export function parametrosConsulta() {
  return new URLSearchParams(location.hash.split("?")[1] || "");
}

async function resolver() {
  const ruta = rutaActual();
  let coincidencia = null;
  for (const r of rutas) {
    const m = ruta.match(r.regex);
    if (m) {
      coincidencia = { ...r, params: Object.fromEntries(r.claves.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
      break;
    }
  }
  if (!coincidencia) coincidencia = { ...rutas.find((r) => r.patron === "*"), params: {} };

  if (coincidencia.roles) {
    if (!sesion.obtener()) {
      avisar("Ingresa para continuar.");
      location.hash = `/ingresar?volver=${encodeURIComponent(ruta)}`;
      return;
    }
    if (!sesion.tieneRol(...coincidencia.roles)) {
      coincidencia = { ...rutas.find((r) => r.patron === "/sin-permiso"), params: {} };
    }
  }

  if (typeof limpiarPaginaAnterior === "function") limpiarPaginaAnterior();
  limpiarPaginaAnterior = null;
  contenedor.replaceChildren();
  document.title = `${coincidencia.pagina.titulo} | CorteYa`;
  window.scrollTo(0, 0);
  document.dispatchEvent(new CustomEvent("corteya:ruta", { detail: { ruta } }));

  try {
    limpiarPaginaAnterior = await coincidencia.pagina.render(contenedor, coincidencia.params);
  } catch (error) {
    console.error(error);
    contenedor.textContent = "No se pudo mostrar esta página.";
  }
  const titulo = contenedor.querySelector("h1");
  if (titulo) {
    titulo.setAttribute("tabindex", "-1");
    titulo.focus({ preventScroll: true });
  }
}

export function iniciar(elemento) {
  contenedor = elemento;
  window.addEventListener("hashchange", resolver);
  resolver();
}
