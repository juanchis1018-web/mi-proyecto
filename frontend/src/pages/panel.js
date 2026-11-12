/**
 * Panel del dueño y agenda del barbero.
 * Administrador: indicadores, gráfica, ocupación y agenda de todo el equipo.
 * Barbero: solo su agenda del día y el cambio de estado de sus turnos.
 */
import { crear, cabecera, cargando, errorCarga } from "../components/dom.js";
import { estadoTurno, indicador } from "../components/tarjetas.js";
import { avisar, avisarError } from "../components/aviso.js";
import * as datos from "../services/datos.js";
import * as sesion from "../services/sesion.js";
import * as f from "../utils/formato.js";
import { aISOFecha, desdeISOFecha, esDiaHabil } from "../../../shared/agenda.js";

const ACCIONES = {
  PENDIENTE: [
    { estado: "CONFIRMADO", texto: "Confirmar" },
    { estado: "CANCELADO", texto: "Cancelar", peligro: true },
  ],
  CONFIRMADO: [
    { estado: "ATENDIDO", texto: "Atendido", requiereInicio: true },
    { estado: "NO_ASISTIO", texto: "No asistió", peligro: true, requiereInicio: true },
    { estado: "CANCELADO", texto: "Cancelar", peligro: true, soloAntes: true },
  ],
};

export default {
  titulo: "Panel",
  async render(contenedor) {
    const esAdmin = sesion.tieneRol("ADMIN");
    const filtrosAgenda = { barbero: "todos", estado: "todos", texto: "" };
    let fecha = aISOFecha(new Date());
    let turnos = [];
    let barberos = [];

    const etiquetaFecha = crear("p", { clase: "selector-fecha__texto", "aria-live": "polite" });
    const inputFecha = crear("input", { type: "date", id: "panel-fecha", value: fecha, "aria-label": "Fecha de la agenda" });
    const zonaResumen = crear("div");
    const zonaError = crear("div");
    const cuerpoTabla = crear("tbody");
    const vacioAgenda = crear("p", { clase: "agenda__vacio", hidden: true, texto: "No hay turnos con esos filtros." });

    const selBarbero = crear("select", { id: "filtro-barbero" }, [crear("option", { value: "todos", texto: "Todos" })]);
    const selEstado = crear(
      "select",
      { id: "filtro-estado" },
      [["todos", "Todos"], ...Object.entries(f.ETIQUETAS_ESTADO)].map(([v, t]) => crear("option", { value: v, texto: t }))
    );
    const buscador = crear("input", { type: "search", id: "filtro-cliente", placeholder: "Nombre del cliente" });

    contenedor.append(
      crear("section", { clase: "seccion panel" }, [
        crear("div", { clase: "contenedor" }, [
          cabecera(
            esAdmin ? "Panel del dueño" : "Mi agenda",
            esAdmin ? "Indicadores y agenda del equipo." : `Turnos de ${sesion.usuario().nombre}.`,
            esAdmin ? crear("a", { clase: "boton boton--primario", href: "#/reservar", texto: "Registrar turno" }) : null
          ),
          crear("div", { clase: "selector-fecha" }, [
            crear("button", { type: "button", clase: "boton boton--secundario boton--chico", "aria-label": "Día anterior", texto: "‹", onclick: () => moverDia(-1) }),
            inputFecha,
            crear("button", { type: "button", clase: "boton boton--secundario boton--chico", "aria-label": "Día siguiente", texto: "›", onclick: () => moverDia(1) }),
            crear("button", { type: "button", clase: "enlace-boton", texto: "Hoy", onclick: () => cambiarFecha(aISOFecha(new Date())) }),
            etiquetaFecha,
          ]),
          zonaError,
          esAdmin ? zonaResumen : null,
          crear("div", { clase: "agenda" }, [
            crear("div", { clase: "agenda__cabecera" }, [
              crear("h2", { texto: "Agenda" }),
              crear("div", { clase: "agenda__filtros" }, [
                esAdmin ? crear("label", {}, [crear("span", { texto: "Barbero" }), selBarbero]) : null,
                crear("label", {}, [crear("span", { texto: "Estado" }), selEstado]),
                crear("label", {}, [crear("span", { texto: "Cliente" }), buscador]),
              ]),
            ]),
            crear("div", { clase: "tabla-scroll" }, [
              crear("table", { clase: "tabla" }, [
                crear("thead", {}, [
                  crear(
                    "tr",
                    {},
                    ["Hora", "Cliente", "Servicio", "Barbero", "Estado"].map((t) => crear("th", { scope: "col", texto: t })).concat(crear("th", { scope: "col" }, [crear("span", { clase: "sr-only", texto: "Acciones" })]))
                  ),
                ]),
                cuerpoTabla,
              ]),
            ]),
            vacioAgenda,
          ]),
        ]),
      ])
    );

    function moverDia(delta) {
      const d = desdeISOFecha(fecha);
      d.setDate(d.getDate() + delta);
      cambiarFecha(aISOFecha(d));
    }

    function cambiarFecha(nueva) {
      if (!desdeISOFecha(nueva)) return;
      fecha = nueva;
      inputFecha.value = nueva;
      cargar();
    }
    inputFecha.addEventListener("change", () => cambiarFecha(inputFecha.value));

    /* Resumen (solo administrador) ----------------------------------- */
    function pintarResumen(r) {
      const maximo = Math.max(1, ...r.porHora.map((h) => h.turnos));
      const horaActual = aISOFecha(new Date()) === fecha ? new Date().getHours() : -1;
      zonaResumen.replaceChildren(
        crear("dl", { clase: "indicadores" }, [
          indicador("Turnos del día", String(r.totalTurnos), `${r.cancelados} cancelados`),
          indicador("Ocupación", f.porcentaje(r.ocupacionPromedio), "Promedio del equipo"),
          indicador("Inasistencias", f.porcentaje(r.tasaInasistencia), `${r.inasistencias} de ${r.turnosCumplidos} turnos ya cumplidos`),
          indicador("Ingresos", f.pesos(r.ingresos), `${f.pesos(r.ingresosProyectados)} si se cumple la agenda`),
        ]),
        crear("div", { clase: "panel__grid" }, [
          crear("figure", { clase: "grafica" }, [
            crear("figcaption", {}, [crear("h3", { texto: "Turnos por hora" }), crear("p", { texto: "Todos los barberos." })]),
            crear(
              "div",
              { clase: "grafica__barras", role: "img", "aria-label": "Turnos por hora: " + r.porHora.map((h) => `${h.hora}:00, ${h.turnos}`).join("; ") },
              r.porHora.map((h) => {
                const pct = (h.turnos / maximo) * 100;
                return crear("div", { clase: "barra" + (h.hora === horaActual ? " is-ahora" : ""), title: `${h.hora}:00 a ${h.hora + 1}:00, ${h.turnos} turnos` }, [
                  crear("span", { clase: "barra__valor", texto: h.turnos ? String(h.turnos) : "", style: `bottom: calc(${pct}% + 4px)` }),
                  crear("span", { clase: "barra__relleno", style: `height: ${pct}%` }),
                  crear("span", { clase: "barra__hora", texto: String(h.hora > 12 ? h.hora - 12 : h.hora) }),
                ]);
              })
            ),
          ]),
          crear("div", { clase: "ocupacion" }, [
            crear("h3", { texto: "Ocupación por barbero" }),
            crear("p", { texto: "Tiempo reservado sobre el tiempo de trabajo." }),
            crear(
              "ul",
              {},
              r.porBarbero.map((b) =>
                crear("li", { clase: "ocupacion__fila" }, [
                  crear("span", { texto: b.nombre }),
                  crear("strong", { texto: f.porcentaje(b.ocupacion) }),
                  crear("span", { clase: "ocupacion__pista", role: "presentation" }, [crear("span", { style: `width: ${Math.round(b.ocupacion * 100)}%` })]),
                ])
              )
            ),
          ]),
        ])
      );
    }

    /* Agenda ---------------------------------------------------------- */
    async function cambiarEstado(t, nuevo) {
      try {
        await datos.turnos.cambiarEstado(t.id, nuevo);
        avisar(`${t.nombreCliente}: ${f.ETIQUETAS_ESTADO[nuevo].toLowerCase()}.`, "exito");
        cargar();
      } catch (error) {
        avisarError(error);
      }
    }

    function acciones(t) {
      const empezo = new Date(t.inicio) <= new Date();
      return (ACCIONES[t.estado] || [])
        .filter((a) => (!a.requiereInicio || empezo) && (!a.soloAntes || !empezo))
        .map((a) =>
          crear("button", {
            type: "button",
            clase: "mini-boton" + (a.peligro ? " mini-boton--peligro" : ""),
            texto: a.texto,
            "aria-label": `${a.texto}: ${t.nombreCliente}, ${f.hora(t.inicio)}`,
            onclick: () => cambiarEstado(t, a.estado),
          })
        );
    }

    function pintarAgenda() {
      const filtrados = turnos.filter(
        (t) =>
          (filtrosAgenda.barbero === "todos" || t.barberoId === Number(filtrosAgenda.barbero)) &&
          (filtrosAgenda.estado === "todos" || t.estado === filtrosAgenda.estado) &&
          (!filtrosAgenda.texto || t.nombreCliente.toLowerCase().includes(filtrosAgenda.texto))
      );
      vacioAgenda.hidden = filtrados.length > 0;
      cuerpoTabla.replaceChildren(
        ...filtrados.map((t) =>
          crear("tr", { clase: t.origen === "WEB" ? "is-reserva-web" : "" }, [
            crear("td", { texto: f.hora(t.inicio) }),
            crear("td", { texto: t.nombreCliente }),
            crear("td", { texto: t.servicio.nombre }),
            crear("td", { texto: t.barbero.nombre }),
            crear("td", {}, [estadoTurno(t.estado)]),
            crear("td", {}, [crear("div", { clase: "acciones-turno" }, acciones(t))]),
          ])
        )
      );
    }

    selBarbero.addEventListener("change", () => ((filtrosAgenda.barbero = selBarbero.value), pintarAgenda()));
    selEstado.addEventListener("change", () => ((filtrosAgenda.estado = selEstado.value), pintarAgenda()));
    buscador.addEventListener("input", () => ((filtrosAgenda.texto = buscador.value.trim().toLowerCase()), pintarAgenda()));

    async function cargar() {
      const dia = desdeISOFecha(fecha);
      etiquetaFecha.textContent = `${f.fechaLarga(dia)}${esDiaHabil(dia) ? "" : ". La barbería no atiende este día."}`;
      cuerpoTabla.replaceChildren(crear("tr", {}, [crear("td", { colspan: 6 }, [cargando()])]));
      if (esAdmin) zonaResumen.replaceChildren(cargando("Calculando indicadores…"));
      try {
        const [lista, resumen] = await Promise.all([datos.turnos.listar({ fecha }), esAdmin ? datos.reportes.resumen({ fecha }) : null]);
        turnos = lista;
        zonaError.replaceChildren();
        if (resumen) pintarResumen(resumen);
        pintarAgenda();
      } catch (error) {
        cuerpoTabla.replaceChildren();
        zonaResumen.replaceChildren();
        zonaError.replaceChildren(errorCarga(error, cargar));
      }
    }

    if (esAdmin) {
      try {
        barberos = await datos.barberos.listar({ todos: true });
        barberos.forEach((b) => selBarbero.append(crear("option", { value: b.id, texto: b.nombre })));
      } catch {
        /* el filtro queda solo con "Todos" */
      }
    }
    cargar();
  },
};
