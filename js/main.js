/*
 * CorteYa - Navegación y arranque
 */
window.CorteYa = window.CorteYa || {};

(function (app) {
  "use strict";

  /* Menú desplegable en celular y tableta ------------------------------ */
  function iniciarMenu() {
    const boton = document.querySelector(".menu-boton");
    const menu = document.getElementById("menu-principal");

    function cerrar() {
      menu.classList.remove("is-abierto");
      boton.setAttribute("aria-expanded", "false");
    }

    boton.addEventListener("click", () => {
      const abierto = menu.classList.toggle("is-abierto");
      boton.setAttribute("aria-expanded", String(abierto));
    });

    menu.addEventListener("click", (e) => {
      if (e.target.closest("a")) cerrar();
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
  }

  /* Resalta en el menú la sección que se está viendo ------------------- */
  function iniciarSeccionActiva() {
    const enlaces = Array.from(document.querySelectorAll(".menu a"));
    const secciones = enlaces.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    if (!("IntersectionObserver" in window)) return;

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          enlaces.forEach((a) => {
            const activo = a.getAttribute("href") === `#${entrada.target.id}`;
            a.classList.toggle("is-activo", activo);
            if (activo) a.setAttribute("aria-current", "location");
            else a.removeAttribute("aria-current");
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    secciones.forEach((s) => observador.observe(s));
  }

  document.addEventListener("DOMContentLoaded", () => {
    iniciarMenu();
    iniciarSeccionActiva();
    app.catalogo.iniciar();
    app.reserva.iniciar();
    app.panel.iniciar();
  });
})(window.CorteYa);
