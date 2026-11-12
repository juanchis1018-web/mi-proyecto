/** Administración del equipo de barberos (CRUD). */
import { crear, cabecera, cargando, errorCarga, vacio } from "../components/dom.js";
import { campo, validarFormulario, validarAlEscribir, mostrarErroresApi } from "../components/formulario.js";
import { dialogoFormulario, confirmar } from "../components/dialogo.js";
import { avatar } from "../components/tarjetas.js";
import { avisar, avisarError } from "../components/aviso.js";
import * as datos from "../services/datos.js";
import * as validar from "../utils/validaciones.js";

const REGLAS = {
  nombre: validar.nombre,
  especialidad: (v) => validar.requerido(v, "La especialidad") || (v.trim().length > 80 ? "Máximo 80 caracteres." : ""),
  experiencia: (v) => validar.entero(v, { min: 0, max: 60, etiqueta: "La experiencia" }),
  servicios: (v) => (v && v.length ? "" : "Elige al menos un servicio."),
  almuerzoInicio: validar.hora,
  almuerzoFin: (v, d) => validar.hora(v) || (v <= d.almuerzoInicio ? "Debe ser posterior al inicio del almuerzo." : ""),
};

export default {
  titulo: "Barberos",
  async render(contenedor) {
    let barberos = [];
    let servicios = [];
    const zona = crear("div", {}, [cargando()]);

    contenedor.append(
      crear("section", { clase: "seccion" }, [
        crear("div", { clase: "contenedor" }, [
          cabecera(
            "Barberos",
            "Gestiona el equipo, los servicios que presta cada barbero y su hora de almuerzo. La agenda solo ofrece horas fuera del almuerzo.",
            crear("button", { type: "button", clase: "boton boton--primario", texto: "Nuevo barbero", onclick: () => abrirFormulario() })
          ),
          zona,
        ]),
      ])
    );

    function abrirFormulario(barbero = null) {
      const editar = !!barbero;
      const dialogo = dialogoFormulario({
        titulo: editar ? `Editar a ${barbero.nombre}` : "Nuevo barbero",
        textoGuardar: editar ? "Guardar cambios" : "Crear barbero",
        campos: [
          campo({ nombre: "nombre", etiqueta: "Nombre completo", valor: barbero?.nombre, atributos: { maxlength: 60 } }),
          campo({ nombre: "especialidad", etiqueta: "Especialidad", valor: barbero?.especialidad, atributos: { maxlength: 80 } }),
          campo({ nombre: "experiencia", etiqueta: "Años de experiencia", tipo: "number", valor: barbero?.experiencia ?? 0, atributos: { min: 0, max: 60 } }),
          campo({
            nombre: "servicios",
            etiqueta: "Servicios que presta",
            tipo: "checkboxes",
            valor: barbero?.servicios || [],
            opciones: servicios.filter((s) => s.activo || barbero?.servicios.includes(s.id)).map((s) => ({ valor: s.id, texto: s.nombre })),
          }),
          crear("div", { clase: "campos-fila" }, [
            campo({ nombre: "almuerzoInicio", etiqueta: "Almuerzo desde", tipo: "time", valor: barbero?.almuerzoInicio || "12:00", atributos: { step: 1800 } }),
            campo({ nombre: "almuerzoFin", etiqueta: "Almuerzo hasta", tipo: "time", valor: barbero?.almuerzoFin || "13:00", atributos: { step: 1800 } }),
          ]),
          editar ? campo({ nombre: "activo", etiqueta: "Estado", tipo: "select", valor: String(barbero.activo), opciones: [{ valor: "true", texto: "Activo" }, { valor: "false", texto: "Desactivado" }] }) : null,
        ].filter(Boolean),
        alGuardar: async (form, mostrarError) => {
          const { valido, datos: v } = validarFormulario(form, REGLAS);
          if (!valido) return false;
          const cuerpo = {
            nombre: v.nombre,
            especialidad: v.especialidad,
            experiencia: Number(v.experiencia),
            servicios: v.servicios.map(Number),
            almuerzoInicio: v.almuerzoInicio,
            almuerzoFin: v.almuerzoFin,
          };
          if (editar) cuerpo.activo = v.activo === "true";
          try {
            if (editar) await datos.barberos.actualizar(barbero.id, cuerpo);
            else await datos.barberos.crear(cuerpo);
            avisar(editar ? "Barbero actualizado." : "Barbero creado.", "exito");
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

    async function desactivar(b) {
      const ok = await confirmar({
        titulo: "Desactivar barbero",
        mensaje: `${b.nombre} dejará de aparecer para nuevas reservas. Sus turnos ya registrados se conservan.`,
        textoConfirmar: "Desactivar",
        peligro: true,
      });
      if (!ok) return;
      try {
        await datos.barberos.eliminar(b.id);
        avisar("Barbero desactivado.", "exito");
        cargar();
      } catch (error) {
        avisarError(error);
      }
    }

    function pintar() {
      if (!barberos.length) {
        zona.replaceChildren(vacio("Todavía no hay barberos. Agrega el primero."));
        return;
      }
      const nombreServicio = (id) => servicios.find((s) => s.id === id)?.nombre || `#${id}`;
      zona.replaceChildren(
        crear(
          "ul",
          { clase: "barberos barberos--admin" },
          barberos.map((b, i) =>
            crear("li", { clase: "barbero" + (b.activo ? "" : " is-inactivo") }, [
              crear("div", { clase: "barbero__cabecera" }, [
                avatar(b.nombre, { tamano: "md", variante: i }),
                crear("span", { clase: `estado ${b.activo ? "estado--ATENDIDO" : "estado--CANCELADO"}`, texto: b.activo ? "Activo" : "Desactivado" }),
              ]),
              crear("h3", { texto: b.nombre }),
              crear("p", { clase: "barbero__especialidad", texto: b.especialidad }),
              crear("p", { clase: "barbero__exp", texto: `${b.experiencia} años de experiencia. Almuerzo de ${b.almuerzoInicio} a ${b.almuerzoFin}.` }),
              crear("p", { clase: "barbero__servicios", texto: b.servicios.map(nombreServicio).join(", ") }),
              crear("div", { clase: "acciones-turno acciones-turno--inicio" }, [
                crear("button", { type: "button", clase: "mini-boton", texto: "Editar", "aria-label": `Editar a ${b.nombre}`, onclick: () => abrirFormulario(b) }),
                b.activo ? crear("button", { type: "button", clase: "mini-boton mini-boton--peligro", texto: "Desactivar", "aria-label": `Desactivar a ${b.nombre}`, onclick: () => desactivar(b) }) : null,
              ]),
            ])
          )
        )
      );
    }

    async function cargar() {
      try {
        [barberos, servicios] = await Promise.all([datos.barberos.listar({ todos: true }), datos.servicios.listar({ todos: true })]);
        pintar();
      } catch (error) {
        zona.replaceChildren(errorCarga(error, cargar));
      }
    }
    cargar();
  },
};
