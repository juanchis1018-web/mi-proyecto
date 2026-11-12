/**
 * Ventanas de diálogo accesibles basadas en el elemento <dialog>:
 * formularios de creación/edición y confirmaciones.
 */
import { crear } from "./dom.js";

function abrirDialogo(contenido, { etiqueta }) {
  const dialogo = crear("dialog", { clase: "dialogo", "aria-label": etiqueta }, contenido);
  document.body.append(dialogo);
  dialogo.addEventListener("close", () => dialogo.remove());
  dialogo.showModal();
  return dialogo;
}

/**
 * Abre un formulario en un diálogo.
 * alGuardar(form) debe devolver true para cerrar el diálogo.
 */
export function dialogoFormulario({ titulo, campos, textoGuardar = "Guardar", alGuardar }) {
  const errorGeneral = crear("p", { clase: "formulario__error", role: "alert" });
  const botonGuardar = crear("button", { type: "submit", clase: "boton boton--primario", texto: textoGuardar });
  const form = crear("form", { clase: "dialogo__form", novalidate: true }, [
    crear("div", { clase: "dialogo__cabecera" }, [
      crear("h2", { texto: titulo }),
      crear("button", { type: "button", clase: "dialogo__cerrar", "aria-label": "Cerrar", texto: "×", onclick: () => dialogo.close() }),
    ]),
    crear("div", { clase: "dialogo__cuerpo" }, [...campos, errorGeneral]),
    crear("div", { clase: "dialogo__acciones" }, [
      crear("button", { type: "button", clase: "boton boton--secundario", texto: "Cancelar", onclick: () => dialogo.close() }),
      botonGuardar,
    ]),
  ]);
  const dialogo = abrirDialogo([form], { etiqueta: titulo });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorGeneral.textContent = "";
    botonGuardar.disabled = true;
    try {
      const cerrar = await alGuardar(form, (mensaje) => (errorGeneral.textContent = mensaje));
      if (cerrar) dialogo.close();
    } finally {
      botonGuardar.disabled = false;
    }
  });

  const primero = form.querySelector("input, select, textarea");
  if (primero) primero.focus();
  return dialogo;
}

/** Confirmación con botones explícitos. Devuelve una promesa con true/false. */
export function confirmar({ titulo, mensaje, textoConfirmar = "Confirmar", peligro = false }) {
  return new Promise((resolver) => {
    let respuesta = false;
    const botonSi = crear("button", {
      type: "button",
      clase: "boton " + (peligro ? "boton--peligro" : "boton--primario"),
      texto: textoConfirmar,
      onclick: () => {
        respuesta = true;
        dialogo.close();
      },
    });
    const dialogo = abrirDialogo(
      [
        crear("div", { clase: "dialogo__form" }, [
          crear("div", { clase: "dialogo__cabecera" }, [crear("h2", { texto: titulo })]),
          crear("div", { clase: "dialogo__cuerpo" }, [crear("p", { texto: mensaje })]),
          crear("div", { clase: "dialogo__acciones" }, [
            crear("button", { type: "button", clase: "boton boton--secundario", texto: "Volver", onclick: () => dialogo.close() }),
            botonSi,
          ]),
        ]),
      ],
      { etiqueta: titulo }
    );
    dialogo.addEventListener("close", () => resolver(respuesta));
    botonSi.focus();
  });
}
