/**
 * Cliente de la API REST de CorteYa (fetch + JWT).
 * Expone la misma interfaz que demoApi.js para que las páginas no dependan
 * de dónde vienen los datos.
 */
import { ErrorApi, MENSAJES } from "./errores.js";
import * as sesion from "./sesion.js";
import { API_URL } from "../config.js";

export const modo = "api";

async function pedir(metodo, ruta, { cuerpo, consulta } = {}) {
  const url = new URL(`${API_URL}${ruta}`, location.href);
  if (consulta) {
    Object.entries(consulta).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }
  const cabeceras = { Accept: "application/json" };
  if (cuerpo !== undefined) cabeceras["Content-Type"] = "application/json";
  const token = sesion.token();
  if (token) cabeceras.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(url, { method: metodo, headers: cabeceras, body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined });
  } catch {
    throw new ErrorApi(0, MENSAJES.RED);
  }

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const error = (datos && datos.error) || {};
    if (respuesta.status === 401 && token) sesion.cerrar();
    throw new ErrorApi(respuesta.status, error.mensaje || "No se pudo completar la solicitud.", error.detalles || []);
  }
  return datos;
}

/** Comprueba si hay un backend disponible (con tiempo límite). */
export async function salud({ tiempoLimiteMs = 2500 } = {}) {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), tiempoLimiteMs);
  try {
    const r = await fetch(new URL(`${API_URL}/salud`, location.href), { signal: control.signal, headers: { Accept: "application/json" } });
    const datos = await r.json();
    return r.ok && datos.estado === "ok";
  } catch {
    return false;
  } finally {
    clearTimeout(temporizador);
  }
}

export const auth = {
  login: (credenciales) => pedir("POST", "/auth/login", { cuerpo: credenciales }),
  registro: (datos) => pedir("POST", "/auth/registro", { cuerpo: datos }),
  yo: () => pedir("GET", "/auth/yo"),
};

export const servicios = {
  listar: ({ todos = false } = {}) => pedir("GET", "/servicios", { consulta: { todos: todos || undefined } }),
  crear: (datos) => pedir("POST", "/servicios", { cuerpo: datos }),
  actualizar: (id, datos) => pedir("PUT", `/servicios/${id}`, { cuerpo: datos }),
  eliminar: (id) => pedir("DELETE", `/servicios/${id}`),
};

export const barberos = {
  listar: ({ todos = false } = {}) => pedir("GET", "/barberos", { consulta: { todos: todos || undefined } }),
  crear: (datos) => pedir("POST", "/barberos", { cuerpo: datos }),
  actualizar: (id, datos) => pedir("PUT", `/barberos/${id}`, { cuerpo: datos }),
  eliminar: (id) => pedir("DELETE", `/barberos/${id}`),
  disponibilidad: (id, consulta) => pedir("GET", `/barberos/${id}/disponibilidad`, { consulta }),
  proximosLibres: (consulta = {}) => pedir("GET", "/barberos/proximos-libres", { consulta }),
};

export const turnos = {
  listar: (consulta = {}) => pedir("GET", "/turnos", { consulta }),
  reservar: (datos) => pedir("POST", "/turnos", { cuerpo: datos }),
  cambiarEstado: (id, estado) => pedir("PATCH", `/turnos/${id}/estado`, { cuerpo: { estado } }),
};

export const reportes = {
  resumen: (consulta = {}) => pedir("GET", "/reportes/resumen", { consulta }),
};
