/**
 * Datos iniciales del negocio: los usa el seeder del backend y el modo
 * demostración del frontend. Las contraseñas son solo de demostración.
 */
import { NEGOCIO } from "./negocio.js";
import { inicioDelDia, combinar, sumarMinutos, cruzaAlmuerzo, esDiaHabil } from "./agenda.js";

export const SERVICIOS = [
  { id: 1, nombre: "Corte clásico", categoria: "corte", duracionMin: 30, precio: 25000, descripcion: "Tijera y máquina, lavado y peinado.", activo: true },
  { id: 2, nombre: "Corte con diseño", categoria: "corte", duracionMin: 60, precio: 38000, descripcion: "Degradado y líneas o figuras a mano alzada.", activo: true },
  { id: 3, nombre: "Corte infantil", categoria: "corte", duracionMin: 30, precio: 20000, descripcion: "Para menores de 12 años.", activo: true },
  { id: 4, nombre: "Arreglo de barba", categoria: "barba", duracionMin: 30, precio: 18000, descripcion: "Perfilado con navaja y toalla caliente.", activo: true },
  { id: 5, nombre: "Afeitado tradicional", categoria: "barba", duracionMin: 30, precio: 22000, descripcion: "Afeitado completo con espuma y bálsamo.", activo: true },
  { id: 6, nombre: "Cejas", categoria: "barba", duracionMin: 30, precio: 8000, descripcion: "Perfilado con cuchilla.", activo: true },
  { id: 7, nombre: "Corte y barba", categoria: "combo", duracionMin: 60, precio: 38000, descripcion: "Corte clásico más arreglo de barba.", activo: true },
  { id: 8, nombre: "Combo completo", categoria: "combo", duracionMin: 90, precio: 52000, descripcion: "Corte con diseño, barba y cejas.", activo: true },
];

export const BARBEROS = [
  { id: 1, nombre: "Andrés Cárdenas", especialidad: "Degradados y diseños", experiencia: 8, servicios: [1, 2, 3, 6, 7, 8], almuerzoInicio: "12:00", almuerzoFin: "13:00", activo: true, email: "andres@corteya.co" },
  { id: 2, nombre: "Kevin Ospina", especialidad: "Barba y afeitado con navaja", experiencia: 5, servicios: [1, 4, 5, 6, 7], almuerzoInicio: "13:00", almuerzoFin: "14:00", activo: true, email: "kevin@corteya.co" },
  { id: 3, nombre: "Luisa Herrera", especialidad: "Cortes clásicos e infantiles", experiencia: 6, servicios: [1, 3, 4, 6, 7], almuerzoInicio: "12:30", almuerzoFin: "13:30", activo: true, email: "luisa@corteya.co" },
  { id: 4, nombre: "Jhon Mosquera", especialidad: "Cortes texturizados y combos", experiencia: 10, servicios: [1, 2, 4, 5, 7, 8], almuerzoInicio: "13:30", almuerzoFin: "14:30", activo: true, email: "jhon@corteya.co" },
];

/** Cuentas de demostración (documentadas en el README). */
export const CUENTAS_DEMO = {
  admin: { nombre: "Dueño de la barbería", email: "admin@corteya.co", password: "Admin123*", rol: "ADMIN", celular: "3001112233" },
  cliente: { nombre: "Camilo Pérez", email: "cliente@corteya.co", password: "Cliente123*", rol: "CLIENTE", celular: "3104567890" },
  barberoPassword: "Barbero123*",
};

const CLIENTES_SIMULADOS = [
  "Sebastián P.", "Mateo G.", "Daniel L.", "Juan David M.", "Felipe C.", "Santiago V.",
  "Nicolás B.", "Alejandro T.", "Esteban O.", "Julián H.", "Samuel A.", "Tomás R.",
];

function generadorConSemilla(semilla) {
  let s = semilla % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Turnos simulados desde hoy hasta dentro de `dias` días (deterministas por fecha).
 * Los turnos que ya terminaron quedan como atendidos o no asistió.
 */
export function generarTurnos({ ahora = new Date(), dias = 7, servicios = SERVICIOS, barberos = BARBEROS, negocio = NEGOCIO } = {}) {
  const turnos = [];
  const hoy = inicioDelDia(ahora);

  for (let d = 0; d < dias; d++) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + d);
    if (!esDiaHabil(fecha, negocio)) continue;

    const azar = generadorConSemilla(fecha.getFullYear() * 10000 + (fecha.getMonth() + 1) * 100 + fecha.getDate());
    const ocupacionObjetivo = d === 0 ? 0.6 : Math.max(0.2, 0.5 - d * 0.05);

    barberos.forEach((barbero) => {
      const cierre = combinar(fecha, negocio.cierre);
      let cursor = combinar(fecha, negocio.apertura);

      while (cursor < cierre) {
        const servicioId = barbero.servicios[Math.floor(azar() * barbero.servicios.length)];
        const servicio = servicios.find((s) => s.id === servicioId);
        const fin = sumarMinutos(cursor, servicio.duracionMin);
        if (azar() < ocupacionObjetivo && fin <= cierre && !cruzaAlmuerzo(barbero, cursor, fin)) {
          let estado = "CONFIRMADO";
          if (fin <= ahora) estado = azar() < 0.12 ? "NO_ASISTIO" : "ATENDIDO";
          else if (azar() < 0.3) estado = "PENDIENTE";
          turnos.push({
            nombreCliente: CLIENTES_SIMULADOS[Math.floor(azar() * CLIENTES_SIMULADOS.length)],
            barberoId: barbero.id,
            servicioId: servicio.id,
            inicio: cursor.toISOString(),
            fin: fin.toISOString(),
            estado,
            precio: servicio.precio,
            origen: "MOSTRADOR",
          });
          cursor = fin;
        } else {
          cursor = sumarMinutos(cursor, negocio.intervaloMin);
        }
      }
    });
  }
  return turnos;
}
