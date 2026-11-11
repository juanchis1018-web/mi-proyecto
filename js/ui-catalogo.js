/*
 * CorteYa - Inicio, servicios y barberos
 */
window.CorteYa = window.CorteYa || {};

(function (app) {
  "use strict";

  const { data, agenda, util } = app;
  const { crear, formato } = util;
  const CORTE_BASE = data.servicios[0]; // corte clásico de 30 min
  let filtroActual = "todos";
  let ultimoTablero = {};

  /* Tablero de la portada: próximo turno libre de cada barbero ---------- */
  function pintarTablero() {
    const lista = document.getElementById("tablero-lista");
    const turnos = util.todosLosTurnos();
    const filas = data.barberos.map((barbero) => {
      const libre = agenda.proximoLibre({ negocio: data.negocio, barbero, servicio: CORTE_BASE, turnos });
      return { barbero, libre };
    });
    // Primero el que está libre más pronto
    filas.sort((a, b) => (a.libre ? a.libre.inicio : Infinity) - (b.libre ? b.libre.inicio : Infinity));

    lista.replaceChildren(
      ...filas.map(({ barbero, libre }) => {
        const clave = libre ? libre.inicio.getTime() : 0;
        const cambio = ultimoTablero[barbero.id] !== undefined && ultimoTablero[barbero.id] !== clave;
        ultimoTablero[barbero.id] = clave;
        return crear("li", { clase: "tablero__fila" + (cambio ? " is-nuevo" : "") }, [
          crear("span", { clase: "tablero__iniciales", "aria-hidden": "true", texto: barbero.iniciales }),
          crear("span", { clase: "tablero__nombre" }, [
            barbero.nombre,
            crear("span", { clase: "tablero__dia", texto: libre ? formato.diaRelativo(libre.inicio) : "Sin espacio esta semana" }),
          ]),
          crear("span", { clase: "tablero__hora", texto: libre ? formato.hora(libre.inicio) : "--" }),
        ]);
      })
    );
  }

  function pintarReloj() {
    const reloj = document.getElementById("reloj");
    const ahora = new Date();
    reloj.textContent = formato.hora(ahora);
    reloj.setAttribute("datetime", ahora.toISOString());
  }

  /* Servicios ----------------------------------------------------------- */
  function pintarFiltros() {
    const contenedor = document.getElementById("filtros-servicios");
    contenedor.replaceChildren(
      ...data.categorias.map((cat) =>
        crear("button", {
          type: "button",
          clase: "filtro",
          "aria-pressed": String(cat.id === filtroActual),
          "data-categoria": cat.id,
          texto: cat.nombre,
          onclick: () => {
            filtroActual = cat.id;
            pintarFiltros();
            pintarServicios();
          },
        })
      )
    );
  }

  function pintarServicios() {
    const lista = document.getElementById("lista-servicios");
    const visibles = data.servicios.filter((s) => filtroActual === "todos" || s.categoria === filtroActual);
    lista.replaceChildren(
      ...visibles.map((s) =>
        crear("li", { clase: "servicio" }, [
          crear("h3", { texto: s.nombre }),
          crear("span", { clase: "servicio__precio", texto: formato.pesos(s.precio) }),
          crear("p", { clase: "servicio__desc", texto: s.descripcion }),
          crear("span", { clase: "servicio__duracion", texto: formato.duracion(s.duracionMin) }),
          crear("button", {
            type: "button",
            clase: "servicio__reservar",
            texto: "Reservar este servicio",
            onclick: () => app.reserva.iniciarCon({ servicioId: s.id }),
          }),
        ])
      )
    );
  }

  /* Barberos ------------------------------------------------------------ */
  function pintarBarberos() {
    const lista = document.getElementById("lista-barberos");
    const turnos = util.todosLosTurnos();
    lista.replaceChildren(
      ...data.barberos.map((b) => {
        const libre = agenda.proximoLibre({ negocio: data.negocio, barbero: b, servicio: CORTE_BASE, turnos });
        return crear("li", { clase: "barbero" }, [
          crear("span", { clase: "barbero__foto", "aria-hidden": "true", texto: b.iniciales }),
          crear("h3", { texto: b.nombre }),
          crear("p", { clase: "barbero__especialidad", texto: b.especialidad }),
          crear("p", { clase: "barbero__exp", texto: `${b.experiencia} años de experiencia. ${b.servicios.length} servicios.` }),
          crear("p", { clase: "barbero__libre" }, [
            "Próximo espacio libre",
            crear("strong", { texto: libre ? `${formato.diaRelativo(libre.inicio)}, ${formato.hora(libre.inicio)}` : "Agenda llena" }),
          ]),
          crear("button", {
            type: "button",
            clase: "boton boton--secundario",
            texto: `Reservar con ${b.nombre.split(" ")[0]}`,
            onclick: () => app.reserva.iniciarCon({ barberoId: b.id }),
          }),
        ]);
      })
    );
  }

  function pintarNegocio() {
    const n = data.negocio;
    document.getElementById("nombre-negocio").textContent = n.nombre;
    document.getElementById("horario-negocio").textContent =
      `Lunes a sábado de ${formato.hora(agenda.combinar(new Date(), n.apertura))} a ${formato.hora(agenda.combinar(new Date(), n.cierre))} en ${n.direccion}.`;
    document.getElementById("pie-negocio").textContent = `${n.nombre}, ${n.direccion}. Tel. ${n.telefono}`;
  }

  function refrescar() {
    pintarTablero();
    pintarBarberos();
  }

  function iniciar() {
    pintarNegocio();
    pintarReloj();
    pintarFiltros();
    pintarServicios();
    refrescar();
    setInterval(() => {
      pintarReloj();
      pintarTablero();
    }, 60000);
    document.addEventListener("corteya:turnos-cambiaron", refrescar);
  }

  app.catalogo = { iniciar };
})(window.CorteYa);
