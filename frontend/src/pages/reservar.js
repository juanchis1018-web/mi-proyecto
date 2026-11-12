/**
 * Reserva de turno en cuatro pasos: servicio, barbero, fecha y hora, datos.
 * El cliente reserva para sí mismo; el administrador puede registrar turnos
 * de clientes que llaman o llegan al local.
 */
import { crear, cargando, errorCarga } from "../components/dom.js";
import { opcion, campo, validarFormulario, validarAlEscribir, mostrarErroresApi, conCarga } from "../components/formulario.js";
import { avisar } from "../components/aviso.js";
import * as datos from "../services/datos.js";
import * as sesion from "../services/sesion.js";
import { parametrosConsulta } from "../router.js";
import * as f from "../utils/formato.js";
import * as validar from "../utils/validaciones.js";
import { aISOFecha, desdeISOFecha, sumarMinutos, esDiaHabil } from "../../shared/agenda.js";

const PASOS = ["Servicio", "Barbero", "Fecha y hora", "Tus datos"];
const DIAS_VISIBLES = 7;

export default {
  titulo: "Reservar turno",
  async render(contenedor) {
    const usuario = sesion.usuario();
    const esAdmin = usuario.rol === "ADMIN";
    const consulta = parametrosConsulta();
    const estado = {
      paso: 1,
      servicioId: Number(consulta.get("servicio")) || null,
      barberoId: Number(consulta.get("barbero")) || null,
      fecha: null,
      inicio: null,
      disponibilidad: [],
    };
    let servicios = [];
    let barberos = [];

    const cuerpo = crear("div", {}, [cargando()]);
    contenedor.append(
      crear("section", { clase: "seccion" }, [
        crear("div", { clase: "contenedor reserva" }, [
          crear("div", { clase: "seccion__cabecera" }, [
            crear("h1", { clase: "titulo-pagina", texto: esAdmin ? "Registrar turno" : "Reservar turno" }),
            crear("p", {
              texto: esAdmin
                ? "Registra el turno de un cliente que llamó o llegó al local. Solo aparecen horas libres."
                : "Solo te mostramos horas realmente libres: nunca te cruzarás con el turno de otra persona.",
            }),
          ]),
          cuerpo,
        ]),
      ])
    );

    try {
      [servicios, barberos] = await Promise.all([datos.servicios.listar(), datos.barberos.listar()]);
    } catch (error) {
      cuerpo.replaceChildren(errorCarga(error, () => location.reload()));
      return;
    }
    if (!servicios.some((s) => s.id === estado.servicioId)) estado.servicioId = null;
    if (!barberos.some((b) => b.id === estado.barberoId)) estado.barberoId = null;

    const servicioSel = () => servicios.find((s) => s.id === estado.servicioId);
    const barberoSel = () => barberos.find((b) => b.id === estado.barberoId);

    /* Estructura ------------------------------------------------------- */
    const pasos = crear(
      "ol",
      { clase: "pasos", "aria-label": "Pasos de la reserva" },
      PASOS.map((p, i) => crear("li", { clase: "pasos__item", dataset: { paso: i + 1 } }, [crear("span", { texto: esAdmin && i === 3 ? "Cliente" : p })]))
    );
    const fsServicio = crear("fieldset", { clase: "paso" }, [crear("legend", { texto: "¿Qué servicio?" }), crear("div", { clase: "opciones" })]);
    const fsBarbero = crear("fieldset", { clase: "paso" }, [crear("legend", { texto: "¿Con quién?" }), crear("div", { clase: "opciones" })]);
    const dias = crear("div", { clase: "dias", role: "group", "aria-label": "Día" });
    const franjas = crear("div", { clase: "franjas", role: "group", "aria-label": "Hora", "aria-live": "polite" });
    const fsHorario = crear("fieldset", { clase: "paso" }, [crear("legend", { texto: "¿Cuándo?" }), dias, franjas]);

    const camposDatos = esAdmin
      ? [
          campo({ nombre: "nombreCliente", etiqueta: "Nombre del cliente", atributos: { maxlength: 60, autocomplete: "off" } }),
          campo({ nombre: "celularCliente", etiqueta: "Celular del cliente", tipo: "tel", opcional: true, atributos: { inputmode: "numeric", maxlength: 13, placeholder: "300 123 4567" } }),
        ]
      : [crear("p", { clase: "paso__cliente" }, ["A nombre de ", crear("strong", { texto: usuario.nombre }), `. Te escribiremos al ${usuario.celular || "celular registrado"}.`])];
    const fsDatos = crear("fieldset", { clase: "paso" }, [
      crear("legend", { texto: esAdmin ? "¿Para quién es el turno?" : "Confirma tus datos" }),
      ...camposDatos,
      campo({ nombre: "nota", etiqueta: "Nota para el barbero", tipo: "textarea", opcional: true, atributos: { maxlength: 140 } }),
    ]);

    const errorReserva = crear("p", { clase: "formulario__error", role: "alert" });
    const btnAtras = crear("button", { type: "button", clase: "boton boton--secundario", texto: "Atrás" });
    const btnSiguiente = crear("button", { type: "button", clase: "boton boton--primario", texto: "Continuar" });
    const btnConfirmar = crear("button", { type: "submit", clase: "boton boton--primario", texto: "Confirmar turno" });
    const form = crear("form", { clase: "formulario", novalidate: true }, [
      fsServicio,
      fsBarbero,
      fsHorario,
      fsDatos,
      errorReserva,
      crear("div", { clase: "formulario__acciones" }, [btnAtras, btnSiguiente, btnConfirmar]),
    ]);

    const resumen = {};
    const fila = (clave, etiqueta) => crear("div", {}, [crear("dt", { texto: etiqueta }), (resumen[clave] = crear("dd"))]);
    const total = crear("strong");
    const ticket = crear("aside", { clase: "ticket", "aria-live": "polite" }, [
      crear("div", { clase: "ticket__parte" }, [
        crear("p", { clase: "ticket__titulo", texto: "Tu turno" }),
        crear("dl", { clase: "ticket__datos" }, [fila("servicio", "Servicio"), fila("barbero", "Barbero"), fila("fecha", "Fecha"), fila("hora", "Hora")]),
      ]),
      crear("div", { clase: "ticket__talon" }, [crear("span", { texto: "Total" }), total]),
    ]);

    cuerpo.replaceChildren(pasos, crear("div", { clase: "reserva__cuerpo" }, [form, ticket]));

    /* Pintado de cada paso ------------------------------------------- */
    function pintarServicios() {
      fsServicio.querySelector(".opciones").replaceChildren(
        ...servicios.map((s) =>
          opcion({ grupo: "servicio", valor: s.id, marcado: s.id === estado.servicioId, titulo: s.nombre, detalle: `${f.pesos(s.precio)}, ${f.duracion(s.duracionMin)}` })
        )
      );
    }

    function pintarBarberos() {
      fsBarbero.querySelector(".opciones").replaceChildren(
        ...barberos.map((b) => {
          const presta = b.servicios.includes(estado.servicioId);
          return opcion({ grupo: "barbero", valor: b.id, marcado: b.id === estado.barberoId, deshabilitado: !presta, titulo: b.nombre, detalle: presta ? b.especialidad : "No hace este servicio" });
        })
      );
    }

    async function cargarDisponibilidad() {
      dias.replaceChildren(cargando("Consultando la agenda…"));
      franjas.replaceChildren();
      try {
        estado.disponibilidad = await datos.barberos.disponibilidad(estado.barberoId, { servicioId: estado.servicioId, desde: aISOFecha(new Date()), dias: DIAS_VISIBLES });
      } catch (error) {
        dias.replaceChildren(errorCarga(error, cargarDisponibilidad));
        return;
      }
      if (!estado.fecha || !estado.disponibilidad.some((d) => d.fecha === estado.fecha && d.franjas.length)) {
        estado.fecha = (estado.disponibilidad.find((d) => d.franjas.length) || estado.disponibilidad[0]).fecha;
      }
      pintarDias();
      pintarFranjas();
    }

    function pintarDias() {
      dias.replaceChildren(
        ...estado.disponibilidad.map((d) => {
          const fecha = desdeISOFecha(d.fecha);
          const libres = d.franjas.length;
          return crear(
            "button",
            {
              type: "button",
              clase: "dia",
              "aria-pressed": String(d.fecha === estado.fecha),
              disabled: libres === 0,
              "aria-label": `${f.fechaLarga(fecha)}, ${libres ? libres + " horas libres" : "sin horas libres"}`,
              onclick: () => {
                estado.fecha = d.fecha;
                estado.inicio = null;
                pintarDias();
                pintarFranjas();
                actualizar();
              },
            },
            [
              crear("small", { texto: f.diaRelativo(fecha) === "Hoy" ? "Hoy" : f.diaCorto(fecha) }),
              crear("strong", { texto: String(fecha.getDate()) }),
              crear("small", { texto: libres ? `${libres} libres` : esDiaHabil(fecha) ? "Sin cupo" : "Cerrado" }),
            ]
          );
        })
      );
    }

    function pintarFranjas() {
      const dia = estado.disponibilidad.find((d) => d.fecha === estado.fecha);
      if (!dia || !dia.franjas.length) {
        franjas.replaceChildren(crear("p", { clase: "franjas__vacio", texto: "No quedan horas libres este día. Prueba con otro día o con otro barbero." }));
        return;
      }
      franjas.replaceChildren(
        ...dia.franjas.map((fr) =>
          crear("button", {
            type: "button",
            clase: "franja",
            "aria-pressed": String(estado.inicio === fr.inicio),
            texto: f.hora(fr.inicio),
            onclick: () => {
              estado.inicio = fr.inicio;
              pintarFranjas();
              actualizar();
            },
          })
        )
      );
    }

    function dato(dd, valor) {
      dd.textContent = valor || "Sin elegir";
      dd.classList.toggle("is-vacio", !valor);
    }

    function actualizar() {
      const s = servicioSel();
      const b = barberoSel();
      dato(resumen.servicio, s && s.nombre);
      dato(resumen.barbero, b && b.nombre);
      dato(resumen.fecha, estado.inicio && f.fechaLarga(estado.inicio));
      dato(resumen.hora, estado.inicio && `${f.hora(estado.inicio)} a ${f.hora(sumarMinutos(estado.inicio, s.duracionMin))}`);
      total.textContent = f.pesos(s ? s.precio : 0);
      btnSiguiente.disabled = !completo(estado.paso);
    }

    function completo(paso) {
      return paso === 1 ? !!estado.servicioId : paso === 2 ? !!estado.barberoId : paso === 3 ? !!estado.inicio : true;
    }

    function irA(paso) {
      estado.paso = paso;
      [fsServicio, fsBarbero, fsHorario, fsDatos].forEach((fs, i) => (fs.hidden = i + 1 !== paso));
      pasos.querySelectorAll(".pasos__item").forEach((li, i) => {
        li.classList.toggle("is-actual", i + 1 === paso);
        li.classList.toggle("is-hecho", i + 1 < paso);
        if (i + 1 === paso) li.setAttribute("aria-current", "step");
        else li.removeAttribute("aria-current");
      });
      if (paso === 2) pintarBarberos();
      if (paso === 3) cargarDisponibilidad();
      btnAtras.hidden = paso === 1;
      btnSiguiente.hidden = paso === 4;
      btnConfirmar.hidden = paso !== 4;
      errorReserva.textContent = "";
      actualizar();
    }

    /* Eventos -------------------------------------------------------- */
    fsServicio.addEventListener("change", (e) => {
      estado.servicioId = Number(e.target.value);
      if (barberoSel() && !barberoSel().servicios.includes(estado.servicioId)) estado.barberoId = null;
      estado.inicio = null;
      actualizar();
    });
    fsBarbero.addEventListener("change", (e) => {
      estado.barberoId = Number(e.target.value);
      estado.inicio = null;
      estado.fecha = null;
      actualizar();
    });
    btnSiguiente.addEventListener("click", () => completo(estado.paso) && irA(estado.paso + 1));
    btnAtras.addEventListener("click", () => irA(estado.paso - 1));

    const reglas = esAdmin
      ? { nombreCliente: validar.nombre, celularCliente: (v) => (v && v.trim() ? validar.celular(v) : "") }
      : {};
    validarAlEscribir(form, reglas);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (estado.paso !== 4) return;
      const { valido, datos: valores } = validarFormulario(form, reglas);
      if (!valido) return;
      errorReserva.textContent = "";
      try {
        const turno = await conCarga(btnConfirmar, "Reservando…", () =>
          datos.turnos.reservar({
            barberoId: estado.barberoId,
            servicioId: estado.servicioId,
            inicio: estado.inicio,
            nota: valores.nota,
            nombreCliente: valores.nombreCliente,
            celularCliente: valores.celularCliente,
          })
        );
        mostrarConfirmacion(turno);
      } catch (error) {
        if (error.status === 409) {
          errorReserva.textContent = error.mensaje;
          estado.inicio = null;
          irA(3);
          errorReserva.textContent = error.mensaje;
          return;
        }
        if (!mostrarErroresApi(form, error)) errorReserva.textContent = error.mensaje || "No se pudo reservar el turno.";
      }
    });

    function mostrarConfirmacion(turno) {
      avisar(`Turno reservado: ${f.diaRelativo(turno.inicio)}, ${f.hora(turno.inicio)}`, "exito");
      const filas = [
        ["Cliente", turno.nombreCliente],
        ["Servicio", turno.servicio.nombre],
        ["Barbero", turno.barbero.nombre],
        ["Fecha", f.fechaLarga(turno.inicio)],
        ["Hora", f.hora(turno.inicio)],
      ];
      const confirmacion = crear("div", { clase: "confirmacion", tabindex: "-1" }, [
        crear("div", { clase: "ticket ticket--final" }, [
          crear("div", { clase: "ticket__parte" }, [
            crear("p", { clase: "ticket__titulo", texto: "Turno reservado" }),
            crear("p", { clase: "ticket__codigo", texto: turno.codigo }),
            crear("dl", { clase: "ticket__datos" }, filas.map(([dt, dd]) => crear("div", {}, [crear("dt", { texto: dt }), crear("dd", { texto: dd })]))),
          ]),
          crear("div", { clase: "ticket__talon" }, [crear("span", { texto: "Pagas en la barbería" }), crear("strong", { texto: f.pesos(turno.precio) })]),
        ]),
        crear("div", { clase: "confirmacion__acciones" }, [
          crear("a", { clase: "boton boton--secundario", href: esAdmin ? "#/panel" : "#/mis-turnos", texto: esAdmin ? "Ver la agenda" : "Ver mis turnos" }),
          crear("button", {
            type: "button",
            clase: "boton boton--primario",
            texto: esAdmin ? "Registrar otro turno" : "Reservar otro turno",
            onclick: () => {
              location.hash = "/reservar?nuevo=" + Date.now();
            },
          }),
        ]),
      ]);
      cuerpo.replaceChildren(confirmacion);
      confirmacion.focus();
    }

    pintarServicios();
    irA(estado.servicioId ? 2 : 1);
  },
};
