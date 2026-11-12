/** Página de inicio: tablero de turnos libres, catálogo con búsqueda y equipo. */
import { crear, cargando, errorCarga } from "../components/dom.js";
import { filtros, avatar } from "../components/tarjetas.js";
import * as datos from "../services/datos.js";
import * as sesion from "../services/sesion.js";
import * as f from "../utils/formato.js";
import { NEGOCIO, CATEGORIAS } from "../../../shared/negocio.js";
import { combinar } from "../../../shared/agenda.js";

function enlaceReserva(parametros) {
  const u = sesion.usuario();
  if (u && u.rol === "BARBERO") return "#/panel";
  return `#/reservar?${new URLSearchParams(parametros)}`;
}

function portada() {
  const lista = crear("ol", { clase: "tablero__lista", "aria-live": "polite" }, [crear("li", { clase: "tablero__fila" }, [cargando("Buscando espacios libres…")])]);
  const reloj = crear("time", { clase: "tablero__reloj" });
  const hoy = new Date();

  const seccion = crear("section", { clase: "portada" }, [
    crear("div", { clase: "contenedor portada__grid" }, [
      crear("div", { clase: "portada__texto" }, [
        crear("p", { clase: "portada__negocio", texto: NEGOCIO.nombre }),
        crear("h1", { texto: "Tu silla, a la hora que elegiste." }),
        crear("p", { clase: "portada__bajada", texto: "Mira qué barbero está libre, reserva en cuatro pasos y llega justo a tu turno. Sin llamar, sin fila." }),
        crear("div", { clase: "portada__acciones" }, [
          crear("a", { clase: "boton boton--primario", href: enlaceReserva({}), texto: "Reservar turno" }),
          crear("a", { clase: "boton boton--secundario", href: "#servicios", texto: "Ver precios", onclick: (e) => (e.preventDefault(), document.getElementById("servicios").scrollIntoView({ behavior: "smooth" })) }),
        ]),
        crear("p", {
          clase: "portada__horario",
          texto: `Lunes a sábado de ${f.hora(combinar(hoy, NEGOCIO.apertura))} a ${f.hora(combinar(hoy, NEGOCIO.cierre))} en ${NEGOCIO.direccion}.`,
        }),
      ]),
      crear("aside", { clase: "tablero", "aria-labelledby": "tablero-titulo" }, [
        crear("div", { clase: "tablero__cabecera" }, [crear("h2", { id: "tablero-titulo", texto: "Próximo turno libre" }), reloj]),
        lista,
        crear("p", { clase: "tablero__pie", texto: "Para un corte clásico de 30 minutos. Se actualiza cada minuto." }),
      ]),
    ]),
  ]);

  async function actualizar() {
    const ahora = new Date();
    reloj.textContent = f.hora(ahora);
    reloj.setAttribute("datetime", ahora.toISOString());
    try {
      const filas = await datos.barberos.proximosLibres({ servicioId: 1 });
      filas.sort((a, b) => (a.franja ? new Date(a.franja.inicio) : Infinity) - (b.franja ? new Date(b.franja.inicio) : Infinity));
      lista.replaceChildren(
        ...filas.map(({ barbero, franja }, i) =>
          crear("li", { clase: "tablero__fila" }, [
            avatar(barbero.nombre, { tamano: "sm", variante: i }),
            crear("span", { clase: "tablero__nombre" }, [
              barbero.nombre,
              crear("span", { clase: "tablero__dia", texto: franja ? f.diaRelativo(franja.inicio) : "Sin espacio esta semana" }),
            ]),
            crear("span", { clase: "tablero__hora", texto: franja ? f.hora(franja.inicio) : "--" }),
          ])
        )
      );
    } catch (error) {
      lista.replaceChildren(crear("li", { clase: "tablero__fila", texto: "No se pudo consultar la disponibilidad." }));
    }
  }
  actualizar();
  const intervalo = setInterval(actualizar, 60000);
  return { seccion, limpiar: () => clearInterval(intervalo) };
}

function catalogo() {
  let categoria = "todos";
  let busqueda = "";
  let lista = [];
  const ul = crear("ul", { clase: "servicios" });
  const contenedorLista = crear("div", {}, [cargando()]);

  const buscador = crear("input", {
    type: "search",
    clase: "buscador__input",
    id: "buscar-servicio",
    placeholder: "Buscar un servicio",
    oninput: (e) => {
      busqueda = e.target.value.trim().toLowerCase();
      pintar();
    },
  });

  function pintar() {
    const visibles = lista.filter(
      (s) => (categoria === "todos" || s.categoria === categoria) && (!busqueda || `${s.nombre} ${s.descripcion}`.toLowerCase().includes(busqueda))
    );
    if (!visibles.length) {
      contenedorLista.replaceChildren(crear("p", { clase: "vacio", texto: "Ningún servicio coincide con la búsqueda. Prueba con otra palabra o categoría." }));
      return;
    }
    ul.replaceChildren(
      ...visibles.map((s) =>
        crear("li", { clase: "servicio" }, [
          crear("h3", { texto: s.nombre }),
          crear("span", { clase: "servicio__precio", texto: f.pesos(s.precio) }),
          crear("p", { clase: "servicio__desc", texto: s.descripcion }),
          crear("span", { clase: "servicio__duracion", texto: f.duracion(s.duracionMin) }),
          crear("a", { clase: "servicio__reservar", href: enlaceReserva({ servicio: s.id }), texto: "Reservar este servicio" }),
        ])
      )
    );
    contenedorLista.replaceChildren(ul);
  }

  async function cargar() {
    contenedorLista.replaceChildren(cargando());
    try {
      lista = await datos.servicios.listar();
      pintar();
    } catch (error) {
      contenedorLista.replaceChildren(errorCarga(error, cargar));
    }
  }
  cargar();

  return crear("section", { id: "servicios", clase: "seccion" }, [
    crear("div", { clase: "contenedor" }, [
      crear("div", { clase: "seccion__cabecera" }, [
        crear("h2", { texto: "Servicios y precios" }),
        crear("p", { texto: "Precios en pesos colombianos. La duración define cuánto tiempo reservamos en la agenda." }),
      ]),
      crear("div", { clase: "catalogo__herramientas" }, [
        filtros({
          etiqueta: "Filtrar servicios por categoría",
          activo: "todos",
          opciones: [{ valor: "todos", texto: "Todos" }, ...CATEGORIAS.map((c) => ({ valor: c.id, texto: c.nombre }))],
          alCambiar: (v) => {
            categoria = v;
            pintar();
          },
        }),
        crear("div", { clase: "buscador" }, [crear("label", { for: "buscar-servicio", clase: "sr-only", texto: "Buscar un servicio" }), buscador]),
      ]),
      contenedorLista,
    ]),
  ]);
}

function equipo() {
  const ul = crear("ul", { clase: "barberos" }, [cargando()]);
  (async () => {
    try {
      const [barberos, libres] = await Promise.all([datos.barberos.listar(), datos.barberos.proximosLibres({ servicioId: 1 })]);
      ul.replaceChildren(
        ...barberos.map((b, i) => {
          const libre = libres.find((l) => l.barbero.id === b.id)?.franja;
          return crear("li", { clase: "barbero" }, [
            avatar(b.nombre, { tamano: "lg", variante: i }),
            crear("h3", { texto: b.nombre }),
            crear("p", { clase: "barbero__especialidad", texto: b.especialidad }),
            crear("p", { clase: "barbero__exp", texto: `${b.experiencia} años de experiencia. ${b.servicios.length} servicios.` }),
            crear("p", { clase: "barbero__libre" }, [
              "Próximo espacio libre",
              crear("strong", { texto: libre ? `${f.diaRelativo(libre.inicio)}, ${f.hora(libre.inicio)}` : "Agenda llena" }),
            ]),
            crear("a", { clase: "boton boton--secundario", href: enlaceReserva({ barbero: b.id }), texto: `Reservar con ${b.nombre.split(" ")[0]}` }),
          ]);
        })
      );
    } catch (error) {
      ul.replaceChildren(errorCarga(error));
    }
  })();

  return crear("section", { id: "barberos", clase: "seccion seccion--alterna" }, [
    crear("div", { clase: "contenedor" }, [
      crear("div", { clase: "seccion__cabecera" }, [
        crear("h2", { texto: "El equipo" }),
        crear("p", { texto: "Cada barbero tiene su propia agenda. Elige con quién quieres tu turno." }),
      ]),
      ul,
    ]),
  ]);
}

export default {
  titulo: "Turnos para tu barbería",
  render(contenedor) {
    const { seccion, limpiar } = portada();
    contenedor.append(seccion, catalogo(), equipo());
    return limpiar;
  },
};
