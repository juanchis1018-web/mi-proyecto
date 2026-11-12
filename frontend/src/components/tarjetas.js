/** Piezas visuales reutilizables: estado del turno, avatar, indicador y filtros. */
import { crear } from "./dom.js";
import { ETIQUETAS_ESTADO, iniciales } from "../utils/formato.js";

export function estadoTurno(estado) {
  return crear("span", { clase: `estado estado--${estado}`, texto: ETIQUETAS_ESTADO[estado] || estado });
}

export function avatar(nombre, { tamano = "md", variante = 0 } = {}) {
  return crear("span", { clase: `avatar avatar--${tamano} avatar--v${variante % 2}`, "aria-hidden": "true", texto: iniciales(nombre) });
}

export function indicador(titulo, valor, nota) {
  return crear("div", { clase: "indicador" }, [crear("dt", { texto: titulo }), crear("dd", {}, [valor, nota ? crear("small", { texto: nota }) : null])]);
}

/** Grupo de botones de filtro tipo píldora (uno activo a la vez). */
export function filtros({ opciones, activo, etiqueta, alCambiar }) {
  const grupo = crear("div", { clase: "filtros", role: "group", "aria-label": etiqueta });
  const pintar = (seleccion) => {
    grupo.replaceChildren(
      ...opciones.map((o) =>
        crear("button", {
          type: "button",
          clase: "filtro",
          "aria-pressed": String(o.valor === seleccion),
          texto: o.texto,
          onclick: () => {
            pintar(o.valor);
            alCambiar(o.valor);
          },
        })
      )
    );
  };
  pintar(activo);
  return grupo;
}
