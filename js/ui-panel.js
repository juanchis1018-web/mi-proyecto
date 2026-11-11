/*
 * CorteYa - Panel del dueño: indicadores, gráfica y agenda del día
 */
window.CorteYa = window.CorteYa || {};

(function (app) {
  "use strict";

  const { data, agenda, util } = app;
  const { crear, formato, buscar } = util;
  const $ = (id) => document.getElementById(id);

  function turnosDeHoy() {
    const hoy = agenda.inicioDelDia(new Date()).getTime();
    return util
      .todosLosTurnos()
      .filter((t) => agenda.inicioDelDia(new Date(t.inicio)).getTime() === hoy)
      .sort((a, b) => new Date(a.inicio) - new Date(b.inicio) || a.barberoId - b.barberoId);
  }

  /* Indicadores --------------------------------------------------------- */
  function pintarIndicadores(turnos) {
    const hoy = new Date();
    const activos = turnos.filter((t) => t.estado !== "CANCELADO");
    const cerrados = turnos.filter((t) => ["ATENDIDO", "NO_ASISTIO"].includes(t.estado));
    const noAsistio = turnos.filter((t) => t.estado === "NO_ASISTIO").length;
    const ingresos = turnos.filter((t) => t.estado === "ATENDIDO").reduce((suma, t) => suma + t.precio, 0);
    const proyectado = activos.filter((t) => t.estado !== "NO_ASISTIO").reduce((suma, t) => suma + t.precio, 0);

    const abierto = agenda.esDiaHabil(data.negocio, hoy);
    const ocupacionPromedio = abierto
      ? data.barberos.reduce((s, b) => s + agenda.ocupacion({ negocio: data.negocio, barbero: b, fecha: hoy, turnos }), 0) / data.barberos.length
      : 0;

    const tarjetas = [
      ["Turnos de hoy", String(activos.length), `${turnos.length - activos.length} cancelados`],
      ["Ocupación", `${Math.round(ocupacionPromedio * 100)} %`, "Promedio del equipo"],
      ["Inasistencias", cerrados.length ? `${Math.round((noAsistio / cerrados.length) * 100)} %` : "0 %", `${noAsistio} de ${cerrados.length} turnos ya cumplidos`],
      ["Ingresos del día", formato.pesos(ingresos), `${formato.pesos(proyectado)} si se cumple la agenda`],
    ];

    $("indicadores").replaceChildren(
      ...tarjetas.map(([titulo, valor, nota]) =>
        crear("div", { clase: "indicador" }, [crear("dt", { texto: titulo }), crear("dd", {}, [valor, crear("small", { texto: nota })])])
      )
    );
  }

  /* Gráfica de turnos por hora ----------------------------------------- */
  function pintarGrafica(turnos) {
    const apertura = Number(data.negocio.apertura.slice(0, 2));
    const cierre = Number(data.negocio.cierre.slice(0, 2));
    const horaActual = new Date().getHours();
    const conteo = {};
    for (let h = apertura; h < cierre; h++) conteo[h] = 0;
    turnos
      .filter((t) => t.estado !== "CANCELADO")
      .forEach((t) => {
        const h = new Date(t.inicio).getHours();
        if (h in conteo) conteo[h]++;
      });

    const maximo = Math.max(1, ...Object.values(conteo));
    const contenedor = $("grafica-horas");
    const descripcion = Object.entries(conteo)
      .map(([h, n]) => `${h}:00, ${n} turnos`)
      .join("; ");
    contenedor.setAttribute("aria-label", `Turnos por hora: ${descripcion}`);

    contenedor.replaceChildren(
      ...Object.entries(conteo).map(([h, n]) => {
        const porcentaje = (n / maximo) * 100;
        return crear(
          "div",
          { clase: "barra" + (Number(h) === horaActual ? " is-ahora" : ""), title: `${h}:00 a ${Number(h) + 1}:00, ${n} turnos` },
          [
            crear("span", { clase: "barra__valor", texto: n ? String(n) : "", style: `bottom: calc(${porcentaje}% + 4px)` }),
            crear("span", { clase: "barra__relleno", style: `height: ${porcentaje}%` }),
            crear("span", { clase: "barra__hora", texto: Number(h) > 12 ? String(h - 12) : String(h) }),
          ]
        );
      })
    );
  }

  /* Ocupación por barbero ---------------------------------------------- */
  function pintarOcupacion(turnos) {
    const hoy = new Date();
    $("lista-ocupacion").replaceChildren(
      ...data.barberos.map((b) => {
        const valor = agenda.esDiaHabil(data.negocio, hoy) ? agenda.ocupacion({ negocio: data.negocio, barbero: b, fecha: hoy, turnos }) : 0;
        const pct = Math.round(valor * 100);
        return crear("li", { clase: "ocupacion__fila" }, [
          crear("span", { texto: b.nombre }),
          crear("strong", { texto: `${pct} %` }),
          crear("span", { clase: "ocupacion__pista", role: "presentation" }, [crear("span", { style: `width: ${pct}%` })]),
        ]);
      })
    );
  }

  /* Agenda -------------------------------------------------------------- */
  function pintarFiltroBarberos() {
    const select = $("filtro-barbero");
    data.barberos.forEach((b) => select.append(crear("option", { value: b.id, texto: b.nombre })));
  }

  function botonEstado(turno, nuevoEstado, texto, peligro) {
    return crear("button", {
      type: "button",
      clase: "mini-boton" + (peligro ? " mini-boton--peligro" : ""),
      texto,
      "aria-label": `${texto}: ${turno.cliente}, ${formato.hora(new Date(turno.inicio))}`,
      onclick: () => {
        util.cambiarEstado(turno.id, nuevoEstado);
        util.avisar(`${turno.cliente}: ${util.ETIQUETAS_ESTADO[nuevoEstado].toLowerCase()}`);
      },
    });
  }

  function accionesPara(turno) {
    const empezo = new Date(turno.inicio) <= new Date();
    if (turno.estado === "PENDIENTE") {
      return [botonEstado(turno, "CONFIRMADO", "Confirmar"), botonEstado(turno, "CANCELADO", "Cancelar", true)];
    }
    if (turno.estado === "CONFIRMADO") {
      return empezo
        ? [botonEstado(turno, "ATENDIDO", "Atendido"), botonEstado(turno, "NO_ASISTIO", "No asistió", true)]
        : [botonEstado(turno, "CANCELADO", "Cancelar", true)];
    }
    return [];
  }

  function pintarAgenda(turnos) {
    const barbero = $("filtro-barbero").value;
    const estadoFiltro = $("filtro-estado").value;
    const filtrados = turnos.filter(
      (t) => (barbero === "todos" || t.barberoId === Number(barbero)) && (estadoFiltro === "todos" || t.estado === estadoFiltro)
    );

    $("agenda-vacio").hidden = filtrados.length > 0;
    $("tabla-agenda").replaceChildren(
      ...filtrados.map((t) =>
        crear("tr", { clase: t.origen === "web" ? "is-reserva-web" : "" }, [
          crear("td", { texto: formato.hora(new Date(t.inicio)) }),
          crear("td", { texto: t.cliente }),
          crear("td", { texto: buscar.servicio(t.servicioId).nombre }),
          crear("td", { texto: buscar.barbero(t.barberoId).nombre }),
          crear("td", {}, [crear("span", { clase: `estado estado--${t.estado}`, texto: util.ETIQUETAS_ESTADO[t.estado] })]),
          crear("td", {}, [crear("div", { clase: "acciones-turno" }, accionesPara(t))]),
        ])
      )
    );
  }

  function refrescar() {
    const turnos = turnosDeHoy();
    const hoy = new Date();
    $("panel-fecha").textContent = agenda.esDiaHabil(data.negocio, hoy)
      ? `Resumen de hoy, ${formato.fechaLarga(hoy).toLowerCase()}.`
      : `Hoy, ${formato.fechaLarga(hoy).toLowerCase()}, la barbería está cerrada.`;
    pintarIndicadores(turnos);
    pintarGrafica(turnos);
    pintarOcupacion(turnos);
    pintarAgenda(turnos);
  }

  function iniciar() {
    pintarFiltroBarberos();
    $("filtro-barbero").addEventListener("change", () => pintarAgenda(turnosDeHoy()));
    $("filtro-estado").addEventListener("change", () => pintarAgenda(turnosDeHoy()));
    document.addEventListener("corteya:turnos-cambiaron", refrescar);
    refrescar();
  }

  app.panel = { iniciar };
})(window.CorteYa);
