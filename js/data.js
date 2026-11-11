/*
 * CorteYa - Datos simulados
 * En esta fase no hay API ni base de datos: estos objetos imitan lo que
 * devolverán los endpoints /api/v1/servicios, /api/v1/barberos y /api/v1/turnos.
 */
window.CorteYa = window.CorteYa || {};

(function (app) {
  "use strict";

  const negocio = {
    nombre: "Barbería La Esquina",
    direccion: "Calle 53 # 24-18, Bogotá",
    telefono: "601 555 0142",
    // 0 = domingo ... 6 = sábado
    diasAtencion: [1, 2, 3, 4, 5, 6],
    apertura: "09:00",
    cierre: "19:00",
    intervaloMin: 30,
  };

  const servicios = [
    { id: 1, nombre: "Corte clásico", categoria: "corte", duracionMin: 30, precio: 25000, descripcion: "Tijera y máquina, lavado y peinado." },
    { id: 2, nombre: "Corte con diseño", categoria: "corte", duracionMin: 60, precio: 38000, descripcion: "Degradado y líneas o figuras a mano alzada." },
    { id: 3, nombre: "Corte infantil", categoria: "corte", duracionMin: 30, precio: 20000, descripcion: "Para menores de 12 años." },
    { id: 4, nombre: "Arreglo de barba", categoria: "barba", duracionMin: 30, precio: 18000, descripcion: "Perfilado con navaja y toalla caliente." },
    { id: 5, nombre: "Afeitado tradicional", categoria: "barba", duracionMin: 30, precio: 22000, descripcion: "Afeitado completo con espuma y bálsamo." },
    { id: 6, nombre: "Cejas", categoria: "barba", duracionMin: 30, precio: 8000, descripcion: "Perfilado con cuchilla." },
    { id: 7, nombre: "Corte y barba", categoria: "combo", duracionMin: 60, precio: 38000, descripcion: "Corte clásico más arreglo de barba." },
    { id: 8, nombre: "Combo completo", categoria: "combo", duracionMin: 90, precio: 52000, descripcion: "Corte con diseño, barba y cejas." },
  ];

  const categorias = [
    { id: "todos", nombre: "Todos" },
    { id: "corte", nombre: "Cortes" },
    { id: "barba", nombre: "Barba y cejas" },
    { id: "combo", nombre: "Combos" },
  ];

  const barberos = [
    { id: 1, nombre: "Andrés Cárdenas", iniciales: "AC", especialidad: "Degradados y diseños", experiencia: 8, servicios: [1, 2, 3, 6, 7, 8], almuerzo: ["12:00", "13:00"] },
    { id: 2, nombre: "Kevin Ospina", iniciales: "KO", especialidad: "Barba y afeitado con navaja", experiencia: 5, servicios: [1, 4, 5, 6, 7], almuerzo: ["13:00", "14:00"] },
    { id: 3, nombre: "Luisa Herrera", iniciales: "LH", especialidad: "Cortes clásicos e infantiles", experiencia: 6, servicios: [1, 3, 4, 6, 7], almuerzo: ["12:30", "13:30"] },
    { id: 4, nombre: "Jhon Mosquera", iniciales: "JM", especialidad: "Cortes texturizados y combos", experiencia: 10, servicios: [1, 2, 4, 5, 7, 8], almuerzo: ["13:30", "14:30"] },
  ];

  const nombresClientes = [
    "Camilo R.", "Sebastián P.", "Mateo G.", "Daniel L.", "Juan David M.", "Felipe C.",
    "Santiago V.", "Nicolás B.", "Alejandro T.", "Esteban O.", "Julián H.", "Samuel A.",
  ];

  /*
   * Genera turnos simulados para hoy y los próximos seis días.
   * Usa un generador pseudoaleatorio con semilla por fecha para que los
   * datos sean siempre los mismos al recargar la página.
   */
  function generadorConSemilla(semilla) {
    let s = semilla % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function generarTurnosSimulados(agenda) {
    const turnos = [];
    let id = 1000;
    const ahora = new Date();
    const hoy = agenda.inicioDelDia(ahora);

    for (let d = 0; d < 7; d++) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() + d);
      if (!negocio.diasAtencion.includes(fecha.getDay())) continue;

      const azar = generadorConSemilla(fecha.getFullYear() * 10000 + (fecha.getMonth() + 1) * 100 + fecha.getDate());
      // Hoy la barbería está más llena que los días siguientes
      const ocupacionObjetivo = d === 0 ? 0.6 : Math.max(0.2, 0.5 - d * 0.05);

      barberos.forEach((barbero) => {
        const inicio = agenda.combinar(fecha, negocio.apertura);
        const cierre = agenda.combinar(fecha, negocio.cierre);
        let cursor = new Date(inicio);

        while (cursor < cierre) {
          const servicioId = barbero.servicios[Math.floor(azar() * barbero.servicios.length)];
          const servicio = servicios.find((s) => s.id === servicioId);
          const fin = agenda.sumarMinutos(cursor, servicio.duracionMin);
          const reservar = azar() < ocupacionObjetivo;

          if (reservar && fin <= cierre && !agenda.cruzaAlmuerzo(barbero, cursor, fin)) {
            let estado = "CONFIRMADO";
            if (fin <= ahora) estado = azar() < 0.12 ? "NO_ASISTIO" : "ATENDIDO";
            else if (azar() < 0.3) estado = "PENDIENTE";

            turnos.push({
              id: id++,
              cliente: nombresClientes[Math.floor(azar() * nombresClientes.length)],
              barberoId: barbero.id,
              servicioId: servicio.id,
              inicio: cursor.toISOString(),
              fin: fin.toISOString(),
              estado: estado,
              precio: servicio.precio,
              origen: "simulado",
            });
            cursor = fin;
          } else {
            cursor = agenda.sumarMinutos(cursor, negocio.intervaloMin);
          }
        }
      });
    }
    return turnos;
  }

  app.data = { negocio, servicios, categorias, barberos, generarTurnosSimulados };
})(window.CorteYa);
