/**
 * Punto único de acceso a los datos para las páginas.
 *
 * Al arrancar comprueba si la API REST responde: si es así, todas las páginas
 * trabajan contra el backend; si no (por ejemplo, en GitHub Pages), usan el
 * modo demostración, que guarda los datos en el navegador con las mismas reglas.
 */
import * as api from "./api.js";
import * as demo from "./demoApi.js";
import * as sesion from "./sesion.js";
import { MODO } from "../config.js";

let fuente = demo;

export async function iniciar() {
  if (MODO === "api") fuente = api;
  else if (MODO === "demo") fuente = demo;
  else fuente = (await api.salud()) ? api : demo;

  // Una sesión de un modo no sirve en el otro (tokens distintos)
  const token = sesion.token();
  if (token && (fuente === api) === token.startsWith("demo.")) sesion.cerrar();
  return fuente.modo;
}

export const modo = () => fuente.modo;
const delegar = (nombre) => new Proxy({}, { get: (_, metodo) => fuente[nombre][metodo] });

export const auth = delegar("auth");
export const servicios = delegar("servicios");
export const barberos = delegar("barberos");
export const turnos = delegar("turnos");
export const reportes = delegar("reportes");
export const reiniciarDemo = () => demo.reiniciarDemo();
