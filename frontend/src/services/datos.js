/**
 * Punto único de acceso a los datos para las páginas.
 * En esta fase la información se gestiona en el navegador (modo demostración).
 */
import * as demo from "./demoApi.js";

let fuente = demo;

export async function iniciar() {
  return fuente.modo;
}

export const modo = () => fuente.modo;
export const auth = new Proxy({}, { get: (_, p) => fuente.auth[p] });
export const servicios = new Proxy({}, { get: (_, p) => fuente.servicios[p] });
export const barberos = new Proxy({}, { get: (_, p) => fuente.barberos[p] });
export const turnos = new Proxy({}, { get: (_, p) => fuente.turnos[p] });
export const reportes = new Proxy({}, { get: (_, p) => fuente.reportes[p] });
export const reiniciarDemo = () => demo.reiniciarDemo();
