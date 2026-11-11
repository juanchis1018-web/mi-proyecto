/*
 * CorteYa - Utilidades compartidas y estado de la aplicación
 */
window.CorteYa = window.CorteYa || {};

(function (app) {
  "use strict";

  const { data, agenda, storage } = app;

  const fmtPesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  const fmtHora = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });
  const fmtDiaCorto = new Intl.DateTimeFormat("es-CO", { weekday: "short" });
  const fmtFechaLarga = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" });

  function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  const formato = {
    pesos: (valor) => fmtPesos.format(valor),
    hora: (fecha) => fmtHora.format(fecha).replace(/[\u00a0\u202f]/g, " "),
    diaCorto: (fecha) => capitalizar(fmtDiaCorto.format(fecha).replace(".", "")),
    fechaLarga: (fecha) => capitalizar(fmtFechaLarga.format(fecha)),
    /** "Hoy", "Mañana" o el día de la semana */
    diaRelativo: (fecha) => {
      const hoy = agenda.inicioDelDia(new Date());
      const diferencia = Math.round((agenda.inicioDelDia(fecha) - hoy) / 86400000);
      if (diferencia === 0) return "Hoy";
      if (diferencia === 1) return "Mañana";
      return capitalizar(fmtFechaLarga.format(fecha).split(",")[0]);
    },
    duracion: (min) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ""}`),
  };

  const ETIQUETAS_ESTADO = {
    PENDIENTE: "Pendiente",
    CONFIRMADO: "Confirmado",
    ATENDIDO: "Atendido",
    NO_ASISTIO: "No asistió",
    CANCELADO: "Cancelado",
  };

  /* Estado en memoria: turnos simulados + reservas hechas en este navegador */
  const turnosSimulados = data.generarTurnosSimulados(agenda);

  function todosLosTurnos() {
    const cambios = storage.estadosPanel();
    const simulados = turnosSimulados.map((t) => (cambios[t.id] ? { ...t, estado: cambios[t.id] } : t));
    const propios = storage.misTurnos().map((t) => (cambios[t.id] ? { ...t, estado: cambios[t.id] } : t));
    return simulados.concat(propios);
  }

  function cambiarEstado(idTurno, estado) {
    const cambios = storage.estadosPanel();
    cambios[idTurno] = estado;
    storage.guardarEstadosPanel(cambios);
    document.dispatchEvent(new CustomEvent("corteya:turnos-cambiaron"));
  }

  const buscar = {
    servicio: (id) => data.servicios.find((s) => s.id === id),
    barbero: (id) => data.barberos.find((b) => b.id === id),
  };

  /** Crea un elemento con atributos y contenido de texto (evita innerHTML con datos del usuario). */
  function crear(etiqueta, atributos = {}, hijos = []) {
    const el = document.createElement(etiqueta);
    Object.entries(atributos).forEach(([clave, valor]) => {
      if (valor === undefined || valor === null || valor === false) return;
      if (clave === "texto") el.textContent = valor;
      else if (clave === "clase") el.className = valor;
      else if (clave.startsWith("on")) el.addEventListener(clave.slice(2), valor);
      else el.setAttribute(clave, valor === true ? "" : valor);
    });
    [].concat(hijos).forEach((h) => h && el.append(h));
    return el;
  }

  let temporizadorAviso;
  function avisar(mensaje) {
    const aviso = document.getElementById("aviso");
    aviso.textContent = mensaje;
    aviso.classList.add("is-visible");
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => aviso.classList.remove("is-visible"), 3200);
  }

  app.util = { formato, ETIQUETAS_ESTADO, todosLosTurnos, cambiarEstado, buscar, crear, avisar };
})(window.CorteYa);
