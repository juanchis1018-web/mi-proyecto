/** Encabezado: enlaces según el rol, sesión y menú desplegable en celular. */
import { crear, $ } from "./dom.js";
import * as sesion from "../services/sesion.js";
import { ETIQUETAS_ROL } from "../utils/formato.js";
import { avisar } from "./aviso.js";

const ENLACES = [
  { ruta: "/", texto: "Inicio" },
  { ruta: "/reservar", texto: "Reservar", roles: [null, "CLIENTE", "ADMIN"] },
  { ruta: "/mis-turnos", texto: "Mis turnos", roles: ["CLIENTE"] },
  { ruta: "/panel", texto: "Agenda", roles: ["BARBERO"] },
  { ruta: "/panel", texto: "Panel", roles: ["ADMIN"] },
  { ruta: "/admin/servicios", texto: "Servicios", roles: ["ADMIN"] },
  { ruta: "/admin/barberos", texto: "Barberos", roles: ["ADMIN"] },
];

function pintar() {
  const usuario = sesion.usuario();
  const rol = usuario ? usuario.rol : null;
  const rutaActual = (location.hash.replace(/^#/, "") || "/").split("?")[0];

  $("#menu-enlaces").replaceChildren(
    ...ENLACES.filter((e) => !e.roles || e.roles.includes(rol)).map((e) => {
      const activo = rutaActual === e.ruta || (e.ruta !== "/" && rutaActual.startsWith(e.ruta));
      return crear("li", {}, [crear("a", { href: `#${e.ruta}`, clase: activo ? "is-activo" : "", "aria-current": activo ? "page" : false, texto: e.texto })]);
    })
  );

  const zona = $("#menu-sesion");
  if (usuario) {
    zona.replaceChildren(
      crear("span", { clase: "menu__usuario" }, [crear("strong", { texto: usuario.nombre.split(" ")[0] }), crear("small", { texto: ETIQUETAS_ROL[usuario.rol] })]),
      crear("button", {
        type: "button",
        clase: "boton boton--secundario boton--chico",
        texto: "Salir",
        onclick: () => {
          sesion.cerrar();
          avisar("Sesión cerrada.");
          location.hash = "/";
        },
      })
    );
  } else {
    zona.replaceChildren(
      crear("a", { href: "#/ingresar", clase: "boton boton--secundario boton--chico", texto: "Ingresar" }),
      crear("a", { href: "#/registro", clase: "boton boton--primario boton--chico", texto: "Crear cuenta" })
    );
  }
}

export function iniciarEncabezado() {
  const boton = $(".menu-boton");
  const menu = $("#menu-principal");
  const cerrar = () => {
    menu.classList.remove("is-abierto");
    boton.setAttribute("aria-expanded", "false");
  };

  boton.addEventListener("click", () => boton.setAttribute("aria-expanded", String(menu.classList.toggle("is-abierto"))));
  menu.addEventListener("click", (e) => {
    if (e.target.closest("a, button")) cerrar();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menu.classList.contains("is-abierto")) {
      cerrar();
      boton.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".encabezado")) cerrar();
  });

  sesion.alCambiar(pintar);
  document.addEventListener("corteya:ruta", pintar);
  pintar();
}
