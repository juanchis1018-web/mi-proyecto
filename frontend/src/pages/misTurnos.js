/** Mis turnos (cliente): próximos e historial, con cancelación. */
import { crear, cabecera, cargando, errorCarga, vacio } from "../components/dom.js";
import { estadoTurno, filtros } from "../components/tarjetas.js";
import { confirmar } from "../components/dialogo.js";
import { avisar, avisarError } from "../components/aviso.js";
import * as datos from "../services/datos.js";
import * as f from "../utils/formato.js";
import { sePuedeCancelar } from "../../../shared/agenda.js";
import { NEGOCIO } from "../../../shared/negocio.js";

export default {
  titulo: "Mis turnos",
  async render(contenedor) {
    let vista = "proximos";
    let turnos = [];
    const lista = crear("div", {}, [cargando()]);

    contenedor.append(
      crear("section", { clase: "seccion" }, [
        crear("div", { clase: "contenedor" }, [
          cabecera("Mis turnos", `Puedes cancelar un turno hasta ${NEGOCIO.horasMinimasCancelacion} horas antes. Así la hora queda libre para otra persona.`),
          filtros({
            etiqueta: "Ver turnos",
            activo: vista,
            opciones: [
              { valor: "proximos", texto: "Próximos" },
              { valor: "historial", texto: "Historial" },
            ],
            alCambiar: (v) => {
              vista = v;
              pintar();
            },
          }),
          lista,
        ]),
      ])
    );

    async function cancelar(t) {
      const ok = await confirmar({
        titulo: "Cancelar turno",
        mensaje: `¿Cancelar tu turno de ${t.servicio.nombre} con ${t.barbero.nombre} el ${f.fechaLarga(t.inicio).toLowerCase()} a las ${f.hora(t.inicio)}?`,
        textoConfirmar: "Cancelar turno",
        peligro: true,
      });
      if (!ok) return;
      try {
        await datos.turnos.cambiarEstado(t.id, "CANCELADO");
        avisar("Turno cancelado. La hora quedó libre para otra persona.", "exito");
        cargar();
      } catch (error) {
        avisarError(error);
      }
    }

    function pintar() {
      const ahora = new Date();
      const visibles = turnos
        .filter((t) => (vista === "proximos" ? new Date(t.fin) > ahora && t.estado !== "CANCELADO" : new Date(t.fin) <= ahora || t.estado === "CANCELADO"))
        .sort((a, b) => (vista === "proximos" ? 1 : -1) * (new Date(a.inicio) - new Date(b.inicio)));

      if (!visibles.length) {
        lista.replaceChildren(
          vista === "proximos"
            ? vacio("No tienes turnos próximos.", crear("a", { clase: "boton boton--primario", href: "#/reservar", texto: "Reservar turno" }))
            : vacio("Aún no tienes turnos pasados o cancelados.")
        );
        return;
      }

      lista.replaceChildren(
        crear(
          "ul",
          { clase: "mis-turnos" },
          visibles.map((t) =>
            crear("li", { clase: "mi-turno" + (t.estado === "CANCELADO" ? " is-cancelado" : "") }, [
              crear("p", { clase: "mi-turno__fecha" }, [crear("strong", { texto: f.horaSinSufijo(t.inicio) }), crear("span", { texto: `${f.diaRelativo(t.inicio)} ${new Date(t.inicio).getDate()}` })]),
              crear("div", { clase: "mi-turno__info" }, [
                crear("p", { texto: `${t.servicio.nombre} con ${t.barbero.nombre}` }),
                crear("p", { texto: `Código ${t.codigo}, ${f.fechaLarga(t.inicio).toLowerCase()} a las ${f.hora(t.inicio)}. Valor: ${f.pesos(t.precio)}` }),
                crear("p", {}, [estadoTurno(t.estado)]),
              ]),
              sePuedeCancelar(t)
                ? crear("button", { type: "button", clase: "mini-boton mini-boton--peligro", texto: "Cancelar turno", onclick: () => cancelar(t) })
                : null,
            ])
          )
        )
      );
    }

    async function cargar() {
      lista.replaceChildren(cargando());
      try {
        turnos = await datos.turnos.listar();
        pintar();
      } catch (error) {
        lista.replaceChildren(errorCarga(error, cargar));
      }
    }
    cargar();
  },
};
