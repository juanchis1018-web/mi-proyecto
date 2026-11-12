/**
 * Componentes de formulario reutilizables: campo con etiqueta, ayuda y error,
 * opciones tipo tarjeta y validación declarativa.
 */
import { crear } from "./dom.js";

let contador = 0;

/**
 * Crea un campo de formulario.
 * tipo: text | email | tel | password | number | time | textarea | select | checkboxes
 */
export function campo({ nombre, etiqueta, tipo = "text", valor = "", ayuda, opcional, opciones = [], atributos = {} }) {
  const id = `campo-${nombre}-${++contador}`;
  const idError = `${id}-error`;
  const idAyuda = ayuda ? `${id}-ayuda` : null;
  let control;

  if (tipo === "textarea") {
    control = crear("textarea", { id, name: nombre, rows: 2, ...atributos });
    control.value = valor ?? "";
  } else if (tipo === "select") {
    control = crear(
      "select",
      { id, name: nombre, ...atributos },
      opciones.map((o) => crear("option", { value: o.valor, texto: o.texto, selected: String(o.valor) === String(valor) }))
    );
  } else if (tipo === "checkboxes") {
    const seleccion = (valor || []).map(String);
    control = crear(
      "div",
      { clase: "casillas", id, role: "group", "aria-labelledby": `${id}-label` },
      opciones.map((o) => {
        const idOpcion = `${id}-${o.valor}`;
        return crear("label", { clase: "casilla", for: idOpcion }, [
          crear("input", { type: "checkbox", id: idOpcion, name: nombre, value: o.valor, checked: seleccion.includes(String(o.valor)) }),
          crear("span", { texto: o.texto }),
        ]);
      })
    );
  } else {
    control = crear("input", { id, name: nombre, type: tipo, value: valor ?? "", ...atributos });
  }
  if (idAyuda && tipo !== "checkboxes") control.setAttribute("aria-describedby", idAyuda);

  const etiquetaEl =
    tipo === "checkboxes"
      ? crear("p", { clase: "campo__etiqueta", id: `${id}-label` }, [etiqueta, opcional ? crear("span", { clase: "opcional", texto: " (opcional)" }) : null])
      : crear("label", { for: id }, [etiqueta, opcional ? crear("span", { clase: "opcional", texto: " (opcional)" }) : null]);

  return crear("div", { clase: "campo", dataset: { campo: nombre } }, [
    etiquetaEl,
    control,
    ayuda ? crear("p", { clase: "campo__ayuda", id: idAyuda, texto: ayuda }) : null,
    crear("p", { clase: "campo__error", id: idError }),
  ]);
}

/** Lee los valores de un formulario como objeto (las casillas como arreglo). */
export function leerFormulario(form) {
  const datos = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.type === "checkbox") {
      datos[el.name] = datos[el.name] || [];
      if (el.checked) datos[el.name].push(el.value);
    } else if (el.type === "radio") {
      if (el.checked) datos[el.name] = el.value;
    } else {
      datos[el.name] = el.value;
    }
  }
  return datos;
}

/** Muestra u oculta el error de un campo. */
export function marcarError(form, nombre, mensaje) {
  const contenedor = form.querySelector(`[data-campo="${nombre}"]`);
  if (!contenedor) return;
  const error = contenedor.querySelector(".campo__error");
  const controles = contenedor.querySelectorAll("input, select, textarea");
  error.textContent = mensaje || "";
  controles.forEach((c) => {
    c.setAttribute("aria-invalid", mensaje ? "true" : "false");
    const descritos = new Set((c.getAttribute("aria-describedby") || "").split(" ").filter(Boolean));
    if (mensaje) descritos.add(error.id);
    else descritos.delete(error.id);
    if (descritos.size) c.setAttribute("aria-describedby", [...descritos].join(" "));
    else c.removeAttribute("aria-describedby");
  });
}

/**
 * Valida un formulario con un mapa { campo: (valor, datos) => mensaje }.
 * Enfoca el primer campo con error y devuelve { valido, datos }.
 */
export function validarFormulario(form, reglas) {
  const datos = leerFormulario(form);
  let primero = null;
  for (const [nombre, regla] of Object.entries(reglas)) {
    const mensaje = regla(datos[nombre], datos);
    marcarError(form, nombre, mensaje);
    if (mensaje && !primero) primero = nombre;
  }
  if (primero) {
    const control = form.querySelector(`[data-campo="${primero}"] input, [data-campo="${primero}"] select, [data-campo="${primero}"] textarea`);
    if (control) control.focus();
  }
  return { valido: !primero, datos };
}

/** Muestra en el formulario los errores de validación que devolvió la API. */
export function mostrarErroresApi(form, error) {
  const detalles = (error && error.detalles) || [];
  detalles.forEach((d) => marcarError(form, d.campo, d.mensaje));
  return detalles.length > 0;
}

/** Revalida un campo cuando el usuario corrige un valor marcado como inválido. */
export function validarAlEscribir(form, reglas) {
  form.addEventListener("input", (e) => {
    const nombre = e.target.name;
    if (!reglas[nombre] || e.target.getAttribute("aria-invalid") !== "true") return;
    marcarError(form, nombre, reglas[nombre](leerFormulario(form)[nombre], leerFormulario(form)));
  });
}

/** Opción seleccionable con aspecto de tarjeta (radio). */
export function opcion({ grupo, valor, titulo, detalle, marcado, deshabilitado }) {
  const id = `${grupo}-${valor}`;
  return crear("div", { clase: "opcion" }, [
    crear("input", { type: "radio", name: grupo, id, value: valor, checked: marcado, disabled: deshabilitado }),
    crear("label", { for: id }, [crear("span", { clase: "opcion__titulo", texto: titulo }), crear("span", { clase: "opcion__detalle", texto: detalle })]),
  ]);
}

/** Botón que muestra un estado de carga mientras se ejecuta una acción asíncrona. */
export async function conCarga(boton, textoCargando, accion) {
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = textoCargando;
  try {
    return await accion();
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}
