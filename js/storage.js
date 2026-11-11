/*
 * CorteYa - Almacenamiento local
 * Guarda los turnos reservados y los cambios de estado hechos en el panel.
 * Todas las operaciones están protegidas: si el navegador bloquea
 * localStorage (modo privado, por ejemplo), la app sigue funcionando en memoria.
 */
window.CorteYa = window.CorteYa || {};

(function (app) {
  "use strict";

  const CLAVE_TURNOS = "corteya.misTurnos";
  const CLAVE_ESTADOS = "corteya.estadosPanel";
  const memoria = {};

  function leer(clave, porDefecto) {
    try {
      const valor = window.localStorage.getItem(clave);
      return valor ? JSON.parse(valor) : porDefecto;
    } catch (e) {
      return clave in memoria ? memoria[clave] : porDefecto;
    }
  }

  function escribir(clave, valor) {
    memoria[clave] = valor;
    try {
      window.localStorage.setItem(clave, JSON.stringify(valor));
    } catch (e) {
      /* sin almacenamiento persistente: se conserva en memoria */
    }
  }

  app.storage = {
    misTurnos: () => leer(CLAVE_TURNOS, []),
    guardarMisTurnos: (turnos) => escribir(CLAVE_TURNOS, turnos),
    estadosPanel: () => leer(CLAVE_ESTADOS, {}),
    guardarEstadosPanel: (estados) => escribir(CLAVE_ESTADOS, estados),
    borrarTodo: () => {
      escribir(CLAVE_TURNOS, []);
      escribir(CLAVE_ESTADOS, {});
    },
  };
})(window.CorteYa);
