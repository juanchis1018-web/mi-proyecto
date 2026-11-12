/**
 * Configuración del negocio compartida por el frontend y el backend.
 * Horario general de atención y granularidad de la agenda.
 */
export const NEGOCIO = Object.freeze({
  nombre: "Barbería La Esquina",
  direccion: "Calle 53 # 24-18, Bogotá",
  telefono: "601 555 0142",
  zonaHoraria: "America/Bogota",
  // 0 = domingo ... 6 = sábado
  diasAtencion: [1, 2, 3, 4, 5, 6],
  apertura: "09:00",
  cierre: "19:00",
  intervaloMin: 30,
  horasMinimasCancelacion: 2,
  diasReservables: 14,
});

export const ROLES = Object.freeze({ CLIENTE: "CLIENTE", BARBERO: "BARBERO", ADMIN: "ADMIN" });

export const ESTADOS = Object.freeze({
  PENDIENTE: "PENDIENTE",
  CONFIRMADO: "CONFIRMADO",
  ATENDIDO: "ATENDIDO",
  NO_ASISTIO: "NO_ASISTIO",
  CANCELADO: "CANCELADO",
});

export const CATEGORIAS = Object.freeze([
  { id: "corte", nombre: "Cortes" },
  { id: "barba", nombre: "Barba y cejas" },
  { id: "combo", nombre: "Combos" },
]);
