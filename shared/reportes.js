/**
 * Cálculo de indicadores del día para el panel del dueño.
 * Compartido: el backend lo expone en GET /api/v1/reportes/resumen y el
 * modo demostración lo calcula en el navegador.
 */
import { NEGOCIO, ESTADOS } from "./negocio.js";
import { inicioDelDia, ocupacion } from "./agenda.js";

export function resumenDelDia({ fecha, turnos, barberos, negocio = NEGOCIO }) {
  const dia = inicioDelDia(fecha).getTime();
  const delDia = turnos.filter((t) => inicioDelDia(t.inicio).getTime() === dia);
  const activos = delDia.filter((t) => t.estado !== ESTADOS.CANCELADO);
  const cumplidos = delDia.filter((t) => t.estado === ESTADOS.ATENDIDO || t.estado === ESTADOS.NO_ASISTIO);
  const noAsistio = delDia.filter((t) => t.estado === ESTADOS.NO_ASISTIO).length;
  const ingresos = delDia.filter((t) => t.estado === ESTADOS.ATENDIDO).reduce((s, t) => s + Number(t.precio), 0);
  const proyectado = activos.filter((t) => t.estado !== ESTADOS.NO_ASISTIO).reduce((s, t) => s + Number(t.precio), 0);

  const activosBarberos = barberos.filter((b) => b.activo);
  const porBarbero = activosBarberos.map((b) => ({
    barberoId: b.id,
    nombre: b.nombre,
    ocupacion: Number(ocupacion({ barbero: b, fecha, turnos: delDia, negocio }).toFixed(3)),
    turnos: activos.filter((t) => Number(t.barberoId) === Number(b.id)).length,
  }));

  const apertura = Number(negocio.apertura.slice(0, 2));
  const cierre = Number(negocio.cierre.slice(0, 2));
  const porHora = [];
  for (let h = apertura; h < cierre; h++) {
    porHora.push({ hora: h, turnos: activos.filter((t) => new Date(t.inicio).getHours() === h).length });
  }

  const servicios = {};
  activos.forEach((t) => {
    servicios[t.servicioId] = (servicios[t.servicioId] || 0) + 1;
  });

  return {
    fecha: new Date(dia).toISOString(),
    totalTurnos: activos.length,
    cancelados: delDia.length - activos.length,
    ocupacionPromedio: porBarbero.length ? Number((porBarbero.reduce((s, b) => s + b.ocupacion, 0) / porBarbero.length).toFixed(3)) : 0,
    turnosCumplidos: cumplidos.length,
    inasistencias: noAsistio,
    tasaInasistencia: cumplidos.length ? Number((noAsistio / cumplidos.length).toFixed(3)) : 0,
    ingresos,
    ingresosProyectados: proyectado,
    porHora,
    porBarbero,
    serviciosMasVendidos: Object.entries(servicios)
      .map(([servicioId, cantidad]) => ({ servicioId: Number(servicioId), cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5),
  };
}
