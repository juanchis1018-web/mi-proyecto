/** Páginas de error: ruta inexistente y acceso sin permiso. */
import { crear } from "../components/dom.js";

function paginaError(titulo, mensaje) {
  return {
    titulo,
    render(contenedor) {
      contenedor.append(
        crear("section", { clase: "seccion" }, [
          crear("div", { clase: "contenedor pagina-error" }, [
            crear("h1", { clase: "titulo-pagina", texto: titulo }),
            crear("p", { texto: mensaje }),
            crear("a", { clase: "boton boton--primario", href: "#/", texto: "Volver al inicio" }),
          ]),
        ])
      );
    },
  };
}

export const noEncontrada = paginaError("Página no encontrada", "La dirección no existe o cambió. Revisa el enlace o vuelve al inicio.");
export const sinPermiso = paginaError("Sin permiso", "Tu cuenta no tiene acceso a esta sección. Si crees que es un error, ingresa con otra cuenta.");
