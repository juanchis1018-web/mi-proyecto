/** Inicio de sesión. Incluye accesos rápidos a las cuentas de demostración. */
import { crear } from "../components/dom.js";
import { campo, validarFormulario, validarAlEscribir, conCarga } from "../components/formulario.js";
import { avisar } from "../components/aviso.js";
import * as datos from "../services/datos.js";
import * as sesion from "../services/sesion.js";
import { parametrosConsulta } from "../router.js";
import * as validar from "../utils/validaciones.js";
import { CUENTAS_DEMO, BARBEROS } from "../../../shared/datosIniciales.js";

const REGLAS = { email: validar.email, password: (v) => validar.requerido(v, "La contraseña") };

const destinoPorRol = { ADMIN: "/panel", BARBERO: "/panel", CLIENTE: "/" };

export default {
  titulo: "Ingresar",
  render(contenedor) {
    const volver = parametrosConsulta().get("volver");
    const error = crear("p", { clase: "formulario__error", role: "alert" });
    const boton = crear("button", { type: "submit", clase: "boton boton--primario boton--ancho", texto: "Ingresar" });
    const form = crear("form", { clase: "formulario", novalidate: true }, [
      campo({ nombre: "email", etiqueta: "Correo", tipo: "email", atributos: { autocomplete: "email" } }),
      campo({ nombre: "password", etiqueta: "Contraseña", tipo: "password", atributos: { autocomplete: "current-password" } }),
      error,
      boton,
    ]);
    validarAlEscribir(form, REGLAS);

    async function ingresar(credenciales) {
      error.textContent = "";
      try {
        const respuesta = await conCarga(boton, "Ingresando…", () => datos.auth.login(credenciales));
        sesion.iniciar(respuesta);
        avisar(`Hola, ${respuesta.usuario.nombre.split(" ")[0]}.`, "exito");
        location.hash = volver && volver.startsWith("/") ? volver : destinoPorRol[respuesta.usuario.rol];
      } catch (e) {
        error.textContent = e.mensaje || "No se pudo iniciar sesión.";
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const { valido, datos: v } = validarFormulario(form, REGLAS);
      if (valido) ingresar({ email: v.email.trim(), password: v.password });
    });

    const cuentas = [
      { texto: "Cliente", email: CUENTAS_DEMO.cliente.email, password: CUENTAS_DEMO.cliente.password },
      { texto: "Barbero", email: BARBEROS[0].email, password: CUENTAS_DEMO.barberoPassword },
      { texto: "Dueño", email: CUENTAS_DEMO.admin.email, password: CUENTAS_DEMO.admin.password },
    ];

    contenedor.append(
      crear("section", { clase: "seccion seccion--acceso" }, [
        crear("div", { clase: "contenedor acceso" }, [
          crear("div", { clase: "acceso__tarjeta" }, [
            crear("h1", { clase: "titulo-pagina", texto: "Ingresar" }),
            crear("p", { clase: "acceso__bajada" }, ["¿No tienes cuenta? ", crear("a", { href: "#/registro", texto: "Créala en un minuto" }), "."]),
            form,
          ]),
          crear("aside", { clase: "acceso__demo" }, [
            crear("h2", { texto: "Probar con una cuenta de demostración" }),
            crear("p", { texto: "Cada rol ve una parte distinta de la plataforma." }),
            crear(
              "ul",
              {},
              cuentas.map((c) =>
                crear("li", {}, [
                  crear("button", { type: "button", clase: "boton boton--secundario boton--ancho", texto: `Entrar como ${c.texto.toLowerCase()}`, onclick: () => ingresar({ email: c.email, password: c.password }) }),
                  crear("small", { texto: `${c.email} / ${c.password}` }),
                ])
              )
            ),
          ]),
        ]),
      ])
    );
  },
};
