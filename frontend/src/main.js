/**
 * Arranque de la aplicación: define las rutas, prepara el encabezado y
 * conecta la capa de datos.
 */
import * as router from "./router.js";
import * as datos from "./services/datos.js";
import { iniciarEncabezado } from "./components/encabezado.js";
import { NEGOCIO } from "../../shared/negocio.js";

import inicio from "./pages/inicio.js";
import reservar from "./pages/reservar.js";
import misTurnos from "./pages/misTurnos.js";
import panel from "./pages/panel.js";
import adminServicios from "./pages/adminServicios.js";
import adminBarberos from "./pages/adminBarberos.js";
import ingresar from "./pages/ingresar.js";
import registro from "./pages/registro.js";
import { noEncontrada, sinPermiso } from "./pages/errores.js";

router.definir("/", inicio);
router.definir("/reservar", reservar, { roles: ["CLIENTE", "ADMIN"] });
router.definir("/mis-turnos", misTurnos, { roles: ["CLIENTE"] });
router.definir("/panel", panel, { roles: ["ADMIN", "BARBERO"] });
router.definir("/admin/servicios", adminServicios, { roles: ["ADMIN"] });
router.definir("/admin/barberos", adminBarberos, { roles: ["ADMIN"] });
router.definir("/ingresar", ingresar);
router.definir("/registro", registro);
router.definir("/sin-permiso", sinPermiso);
router.definir("*", noEncontrada);

async function arrancar() {
  document.getElementById("pie-negocio").textContent = `${NEGOCIO.nombre}, ${NEGOCIO.direccion}. Tel. ${NEGOCIO.telefono}`;
  iniciarEncabezado();

  // El enlace "Saltar al contenido" enfoca el contenido sin cambiar la ruta
  document.querySelector(".saltar").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("app").focus();
  });

  const modo = await datos.iniciar();
  const banda = document.getElementById("banda-modo");
  if (modo === "demo") {
    banda.hidden = false;
    banda.textContent = "Modo demostración: los datos se guardan solo en este navegador.";
  }
  router.iniciar(document.getElementById("app"));
}

arrancar();
