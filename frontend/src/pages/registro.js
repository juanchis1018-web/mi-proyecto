/** Registro de clientes. */
import { crear } from "../components/dom.js";
import { campo, validarFormulario, validarAlEscribir, mostrarErroresApi, conCarga } from "../components/formulario.js";
import { avisar } from "../components/aviso.js";
import * as datos from "../services/datos.js";
import * as sesion from "../services/sesion.js";
import * as validar from "../utils/validaciones.js";

const REGLAS = {
  nombre: validar.nombre,
  email: validar.email,
  celular: validar.celular,
  password: validar.password,
  confirmacion: (v, d) => (v === d.password ? "" : "Las contraseñas no coinciden."),
};

export default {
  titulo: "Crear cuenta",
  render(contenedor) {
    const error = crear("p", { clase: "formulario__error", role: "alert" });
    const boton = crear("button", { type: "submit", clase: "boton boton--primario boton--ancho", texto: "Crear cuenta" });
    const form = crear("form", { clase: "formulario", novalidate: true }, [
      campo({ nombre: "nombre", etiqueta: "Nombre", atributos: { autocomplete: "name", maxlength: 60 } }),
      campo({ nombre: "email", etiqueta: "Correo", tipo: "email", atributos: { autocomplete: "email" } }),
      campo({ nombre: "celular", etiqueta: "Celular", tipo: "tel", ayuda: "Para recordarte tus turnos.", atributos: { autocomplete: "tel", inputmode: "numeric", maxlength: 13, placeholder: "300 123 4567" } }),
      campo({ nombre: "password", etiqueta: "Contraseña", tipo: "password", ayuda: "Mínimo 8 caracteres, con letras y números.", atributos: { autocomplete: "new-password" } }),
      campo({ nombre: "confirmacion", etiqueta: "Repite la contraseña", tipo: "password", atributos: { autocomplete: "new-password" } }),
      error,
      boton,
    ]);
    validarAlEscribir(form, REGLAS);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      error.textContent = "";
      const { valido, datos: v } = validarFormulario(form, REGLAS);
      if (!valido) return;
      try {
        const respuesta = await conCarga(boton, "Creando cuenta…", () =>
          datos.auth.registro({ nombre: v.nombre.trim(), email: v.email.trim(), celular: validar.soloDigitos(v.celular), password: v.password })
        );
        sesion.iniciar(respuesta);
        avisar("Cuenta creada. Ya puedes reservar.", "exito");
        location.hash = "/reservar";
      } catch (e) {
        if (!mostrarErroresApi(form, e)) error.textContent = e.mensaje || "No se pudo crear la cuenta.";
      }
    });

    contenedor.append(
      crear("section", { clase: "seccion seccion--acceso" }, [
        crear("div", { clase: "contenedor acceso acceso--solo" }, [
          crear("div", { clase: "acceso__tarjeta" }, [
            crear("h1", { clase: "titulo-pagina", texto: "Crear cuenta" }),
            crear("p", { clase: "acceso__bajada" }, ["¿Ya tienes cuenta? ", crear("a", { href: "#/ingresar", texto: "Ingresa" }), "."]),
            form,
          ]),
        ]),
      ])
    );
  },
};
