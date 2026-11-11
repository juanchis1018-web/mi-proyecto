/*
 * CorteYa - Reglas de negocio de la agenda
 * Funciones puras (sin acceso al DOM): calculan horarios, detectan
 * solapamientos y generan las franjas disponibles de cada barbero.
 * Esta lógica se trasladará al AgendaService del backend.
 */
window.CorteYa = window.CorteYa || {};

(function (app) {
  "use strict";

  const ESTADOS_ACTIVOS = ["PENDIENTE", "CONFIRMADO", "ATENDIDO", "NO_ASISTIO"];

  function inicioDelDia(fecha) {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** Combina una fecha con una hora "HH:MM" y devuelve un Date. */
  function combinar(fecha, hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    const d = new Date(fecha);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function sumarMinutos(fecha, minutos) {
    return new Date(fecha.getTime() + minutos * 60000);
  }

  /** Dos intervalos [aIni, aFin) y [bIni, bFin) se solapan si cada uno empieza antes de que termine el otro. */
  function seSolapan(aIni, aFin, bIni, bFin) {
    return aIni < bFin && bIni < aFin;
  }

  function cruzaAlmuerzo(barbero, inicio, fin) {
    if (!barbero.almuerzo) return false;
    const aIni = combinar(inicio, barbero.almuerzo[0]);
    const aFin = combinar(inicio, barbero.almuerzo[1]);
    return seSolapan(inicio, fin, aIni, aFin);
  }

  function esDiaHabil(negocio, fecha) {
    return negocio.diasAtencion.includes(fecha.getDay());
  }

  function turnosDelBarbero(turnos, barberoId, fecha) {
    const dia = inicioDelDia(fecha).getTime();
    return turnos.filter(
      (t) =>
        t.barberoId === barberoId &&
        ESTADOS_ACTIVOS.includes(t.estado) &&
        inicioDelDia(new Date(t.inicio)).getTime() === dia
    );
  }

  /**
   * Franjas en las que el barbero puede atender un servicio en una fecha.
   * Una franja es válida si: el día es hábil, cabe antes del cierre,
   * no cruza el almuerzo, no se solapa con otro turno activo y no ha pasado.
   */
  function franjasDisponibles({ negocio, barbero, servicio, fecha, turnos, ahora = new Date() }) {
    if (!esDiaHabil(negocio, fecha)) return [];
    if (!barbero.servicios.includes(servicio.id)) return [];

    const apertura = combinar(fecha, negocio.apertura);
    const cierre = combinar(fecha, negocio.cierre);
    const ocupados = turnosDelBarbero(turnos, barbero.id, fecha);
    const franjas = [];

    for (let ini = apertura; sumarMinutos(ini, servicio.duracionMin) <= cierre; ini = sumarMinutos(ini, negocio.intervaloMin)) {
      const fin = sumarMinutos(ini, servicio.duracionMin);
      if (ini <= ahora) continue;
      if (cruzaAlmuerzo(barbero, ini, fin)) continue;
      const choca = ocupados.some((t) => seSolapan(ini, fin, new Date(t.inicio), new Date(t.fin)));
      if (!choca) franjas.push({ inicio: ini, fin: fin });
    }
    return franjas;
  }

  /** Primer espacio libre del barbero en los próximos días (por defecto, para un corte de 30 min). */
  function proximoLibre({ negocio, barbero, servicio, turnos, dias = 7, ahora = new Date() }) {
    for (let d = 0; d < dias; d++) {
      const fecha = inicioDelDia(ahora);
      fecha.setDate(fecha.getDate() + d);
      const franjas = franjasDisponibles({ negocio, barbero, servicio, fecha, turnos, ahora });
      if (franjas.length) return franjas[0];
    }
    return null;
  }

  /** Porcentaje del tiempo laborable del barbero (sin almuerzo) que está reservado. */
  function ocupacion({ negocio, barbero, fecha, turnos }) {
    const apertura = combinar(fecha, negocio.apertura);
    const cierre = combinar(fecha, negocio.cierre);
    let minutosLaborables = (cierre - apertura) / 60000;
    if (barbero.almuerzo) {
      minutosLaborables -= (combinar(fecha, barbero.almuerzo[1]) - combinar(fecha, barbero.almuerzo[0])) / 60000;
    }
    const reservados = turnosDelBarbero(turnos, barbero.id, fecha).reduce(
      (total, t) => total + (new Date(t.fin) - new Date(t.inicio)) / 60000,
      0
    );
    return minutosLaborables > 0 ? Math.min(1, reservados / minutosLaborables) : 0;
  }

  /** Valida una reserva antes de guardarla (equivale a la validación del backend que responde 409). */
  function validarReserva({ negocio, barbero, servicio, inicio, turnos }) {
    const fin = sumarMinutos(inicio, servicio.duracionMin);
    const libres = franjasDisponibles({ negocio, barbero, servicio, fecha: inicio, turnos });
    const valida = libres.some((f) => f.inicio.getTime() === inicio.getTime());
    return valida ? { ok: true, fin: fin } : { ok: false, motivo: "Esa hora acaba de ocuparse. Elige otra franja." };
  }

  app.agenda = {
    ESTADOS_ACTIVOS,
    inicioDelDia,
    combinar,
    sumarMinutos,
    seSolapan,
    cruzaAlmuerzo,
    esDiaHabil,
    turnosDelBarbero,
    franjasDisponibles,
    proximoLibre,
    ocupacion,
    validarReserva,
  };
})(window.CorteYa);
