/** Administración del catálogo de servicios (CRUD). */
import { crear, cabecera, cargando, errorCarga, vacio } from "../components/dom.js";
import { campo, validarFormulario, validarAlEscribir, mostrarErroresApi } from "../components/formulario.js";
import { dialogoFormulario, confirmar } from "../components/dialogo.js";
import { avisar, avisarError } from "../components/aviso.js";
import * as datos from "../services/datos.js";
import * as f from "../utils/formato.js";
import * as validar from "../utils/validaciones.js";
import { CATEGORIAS } from "../../shared/negocio.js";

const REGLAS = {
  nombre: (v) => validar.requerido(v, "El nombre") || (v.trim().length > 60 ? "Máximo 60 caracteres." : ""),
  categoria: (v) => (CATEGORIAS.some((c) => c.id === v) ? "" : "Elige una categoría."),
  duracionMin: validar.duracionServicio,
  precio: (v) => validar.entero(v, { min: 1000, max: 1000000, etiqueta: "El precio" }),
  descripcion: (v) => (String(v || "").length > 200 ? "Máximo 200 caracteres." : ""),
};

const nombreCategoria = (id) => CATEGORIAS.find((c) => c.id === id)?.nombre || id;

export default {
  titulo: "Servicios",
  async render(contenedor) {
    let servicios = [];
    let busqueda = "";
    let verInactivos = false;
    const zona = crear("div", {}, [cargando()]);

    const buscador = crear("input", { type: "search", id: "buscar-admin-servicio", placeholder: "Buscar por nombre" });
    const casilla = crear("input", { type: "checkbox", id: "ver-inactivos" });

    contenedor.append(
      crear("section", { clase: "seccion" }, [
        crear("div", { clase: "contenedor" }, [
          cabecera(
            "Servicios",
            "Crea, edita o desactiva los servicios del catálogo. Los servicios desactivados no se pueden reservar, pero se conservan en el historial.",
            crear("button", { type: "button", clase: "boton boton--primario", texto: "Nuevo servicio", onclick: () => abrirFormulario() })
          ),
          crear("div", { clase: "herramientas" }, [
            crear("label", { clase: "buscador" }, [crear("span", { clase: "sr-only", texto: "Buscar servicio" }), buscador]),
            crear("label", { clase: "casilla", for: "ver-inactivos" }, [casilla, crear("span", { texto: "Mostrar desactivados" })]),
          ]),
          zona,
        ]),
      ])
    );

    buscador.addEventListener("input", () => ((busqueda = buscador.value.trim().toLowerCase()), pintar()));
    casilla.addEventListener("change", () => ((verInactivos = casilla.checked), pintar()));

    function abrirFormulario(servicio = null) {
      const editar = !!servicio;
      const dialogo = dialogoFormulario({
        titulo: editar ? `Editar ${servicio.nombre}` : "Nuevo servicio",
        textoGuardar: editar ? "Guardar cambios" : "Crear servicio",
        campos: [
          campo({ nombre: "nombre", etiqueta: "Nombre", valor: servicio?.nombre, atributos: { maxlength: 60 } }),
          campo({ nombre: "categoria", etiqueta: "Categoría", tipo: "select", valor: servicio?.categoria || "corte", opciones: CATEGORIAS.map((c) => ({ valor: c.id, texto: c.nombre })) }),
          crear("div", { clase: "campos-fila" }, [
            campo({ nombre: "duracionMin", etiqueta: "Duración (min)", tipo: "number", valor: servicio?.duracionMin ?? 30, ayuda: "Múltiplos de 30.", atributos: { min: 30, max: 180, step: 30 } }),
            campo({ nombre: "precio", etiqueta: "Precio (COP)", tipo: "number", valor: servicio?.precio ?? "", atributos: { min: 1000, step: 1000 } }),
          ]),
          campo({ nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea", opcional: true, valor: servicio?.descripcion, atributos: { maxlength: 200 } }),
          editar ? campo({ nombre: "activo", etiqueta: "Estado", tipo: "select", valor: String(servicio.activo), opciones: [{ valor: "true", texto: "Activo" }, { valor: "false", texto: "Desactivado" }] }) : null,
        ].filter(Boolean),
        alGuardar: async (form, mostrarError) => {
          const { valido, datos: v } = validarFormulario(form, REGLAS);
          if (!valido) return false;
          const cuerpo = { nombre: v.nombre, categoria: v.categoria, duracionMin: Number(v.duracionMin), precio: Number(v.precio), descripcion: v.descripcion };
          if (editar) cuerpo.activo = v.activo === "true";
          try {
            if (editar) await datos.servicios.actualizar(servicio.id, cuerpo);
            else await datos.servicios.crear(cuerpo);
            avisar(editar ? "Servicio actualizado." : "Servicio creado.", "exito");
            cargar();
            return true;
          } catch (error) {
            if (!mostrarErroresApi(form, error)) mostrarError(error.mensaje);
            return false;
          }
        },
      });
      validarAlEscribir(dialogo.querySelector("form"), REGLAS);
    }

    async function desactivar(s) {
      const ok = await confirmar({
        titulo: "Desactivar servicio",
        mensaje: `"${s.nombre}" dejará de aparecer en el catálogo y no se podrá reservar. Los turnos ya registrados no cambian.`,
        textoConfirmar: "Desactivar",
        peligro: true,
      });
      if (!ok) return;
      try {
        await datos.servicios.eliminar(s.id);
        avisar("Servicio desactivado.", "exito");
        cargar();
      } catch (error) {
        avisarError(error);
      }
    }

    function pintar() {
      const visibles = servicios.filter((s) => (verInactivos || s.activo) && (!busqueda || s.nombre.toLowerCase().includes(busqueda)));
      if (!visibles.length) {
        zona.replaceChildren(vacio(busqueda ? "Ningún servicio coincide con la búsqueda." : "Todavía no hay servicios. Crea el primero."));
        return;
      }
      zona.replaceChildren(
        crear("div", { clase: "tabla-scroll tabla-scroll--libre" }, [
          crear("table", { clase: "tabla tabla--admin" }, [
            crear("thead", {}, [crear("tr", {}, ["Servicio", "Categoría", "Duración", "Precio", "Estado", ""].map((t) => crear("th", { scope: "col", texto: t })))]),
            crear(
              "tbody",
              {},
              visibles.map((s) =>
                crear("tr", { clase: s.activo ? "" : "is-inactivo" }, [
                  crear("td", {}, [crear("strong", { texto: s.nombre }), s.descripcion ? crear("small", { clase: "tabla__detalle", texto: s.descripcion }) : null]),
                  crear("td", { texto: nombreCategoria(s.categoria) }),
                  crear("td", { texto: f.duracion(s.duracionMin) }),
                  crear("td", { texto: f.pesos(s.precio) }),
                  crear("td", {}, [crear("span", { clase: `estado ${s.activo ? "estado--ATENDIDO" : "estado--CANCELADO"}`, texto: s.activo ? "Activo" : "Desactivado" })]),
                  crear("td", {}, [
                    crear("div", { clase: "acciones-turno" }, [
                      crear("button", { type: "button", clase: "mini-boton", texto: "Editar", "aria-label": `Editar ${s.nombre}`, onclick: () => abrirFormulario(s) }),
                      s.activo ? crear("button", { type: "button", clase: "mini-boton mini-boton--peligro", texto: "Desactivar", "aria-label": `Desactivar ${s.nombre}`, onclick: () => desactivar(s) }) : null,
                    ]),
                  ]),
                ])
              )
            ),
          ]),
        ])
      );
    }

    async function cargar() {
      try {
        servicios = await datos.servicios.listar({ todos: true });
        pintar();
      } catch (error) {
        zona.replaceChildren(errorCarga(error, cargar));
      }
    }
    cargar();
  },
};
