/**
 * Utilidad base para crear elementos del DOM sin innerHTML.
 * Todo texto se asigna con textContent, lo que evita inyección de HTML (XSS).
 */
export function crear(etiqueta, atributos = {}, hijos = []) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) {
    if (valor === undefined || valor === null || valor === false) continue;
    if (clave === "texto") el.textContent = valor;
    else if (clave === "clase") el.className = valor;
    else if (clave === "dataset") Object.assign(el.dataset, valor);
    else if (clave.startsWith("on") && typeof valor === "function") el.addEventListener(clave.slice(2), valor);
    else if (clave === "value") el.value = valor;
    // Los estilos se asignan por CSSOM: la política de seguridad (CSP) bloquea el atributo style
    else if (clave === "style") el.style.cssText = valor;
    else el.setAttribute(clave, valor === true ? "" : valor);
  }
  for (const hijo of [].concat(hijos)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo);
  }
  return el;
}

export const $ = (selector, raiz = document) => raiz.querySelector(selector);
export const $$ = (selector, raiz = document) => Array.from(raiz.querySelectorAll(selector));

/** Encabezado estándar de una página o sección. */
export function cabecera(titulo, descripcion, acciones) {
  return crear("div", { clase: "seccion__cabecera" + (acciones ? " seccion__cabecera--acciones" : "") }, [
    crear("div", {}, [crear("h1", { clase: "titulo-pagina", texto: titulo }), descripcion ? crear("p", { texto: descripcion }) : null]),
    acciones || null,
  ]);
}

/** Bloque para estados vacíos: explica qué pasa y ofrece una acción. */
export function vacio(mensaje, accion) {
  return crear("div", { clase: "vacio" }, [crear("p", { texto: mensaje }), accion || null]);
}

export function cargando(mensaje = "Cargando…") {
  return crear("p", { clase: "cargando", role: "status", texto: mensaje });
}

export function errorCarga(error, reintentar) {
  return crear("div", { clase: "vacio vacio--error", role: "alert" }, [
    crear("p", { texto: error && error.mensaje ? error.mensaje : "No se pudo cargar la información." }),
    reintentar ? crear("button", { type: "button", clase: "boton boton--secundario", texto: "Intentar de nuevo", onclick: reintentar }) : null,
  ]);
}
