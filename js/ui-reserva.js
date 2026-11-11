/*
 * CorteYa - Formulario de reserva por pasos y "Mis turnos"
 */
window.CorteYa = window.CorteYa || {};

(function (app) {
  "use strict";

  const { data, agenda, storage, util } = app;
  const { crear, formato, buscar } = util;
  const TOTAL_PASOS = 4;
  const HORAS_MINIMAS_CANCELAR = 2;

  const estado = { paso: 1, servicioId: null, barberoId: null, fecha: null, inicio: null };
  const $ = (id) => document.getElementById(id);

  /* Navegación entre pasos ---------------------------------------------- */
  function pasoCompleto(paso) {
    if (paso === 1) return !!estado.servicioId;
    if (paso === 2) return !!estado.barberoId;
    if (paso === 3) return !!estado.inicio;
    return true;
  }

  function irAPaso(paso) {
    estado.paso = paso;
    document.querySelectorAll("#form-reserva .paso").forEach((fs) => {
      fs.hidden = Number(fs.dataset.paso) !== paso;
    });
    document.querySelectorAll("#pasos .pasos__item").forEach((li) => {
      const n = Number(li.dataset.paso);
      li.classList.toggle("is-actual", n === paso);
      li.classList.toggle("is-hecho", n < paso);
      if (n === paso) li.setAttribute("aria-current", "step");
      else li.removeAttribute("aria-current");
    });

    if (paso === 2) pintarBarberos();
    if (paso === 3) {
      pintarDias();
      pintarFranjas();
    }

    $("btn-atras").hidden = paso === 1;
    $("btn-siguiente").hidden = paso === TOTAL_PASOS;
    $("btn-confirmar").hidden = paso !== TOTAL_PASOS;
    $("error-reserva").textContent = "";
    actualizarBotones();
    if (paso === TOTAL_PASOS) $("cliente-nombre").focus({ preventScroll: true });
  }

  function actualizarBotones() {
    $("btn-siguiente").disabled = !pasoCompleto(estado.paso);
  }

  /* Paso 1: servicio ---------------------------------------------------- */
  function opcion({ nombre, valor, marcado, deshabilitado, titulo, detalle }) {
    const id = `${nombre}-${valor}`;
    return crear("div", { clase: "opcion" }, [
      crear("input", { type: "radio", name: nombre, id, value: valor, checked: marcado, disabled: deshabilitado }),
      crear("label", { for: id }, [
        crear("span", { clase: "opcion__titulo", texto: titulo }),
        crear("span", { clase: "opcion__detalle", texto: detalle }),
      ]),
    ]);
  }

  function pintarServicios() {
    $("opciones-servicio").replaceChildren(
      ...data.servicios.map((s) =>
        opcion({
          nombre: "servicio",
          valor: s.id,
          marcado: s.id === estado.servicioId,
          titulo: s.nombre,
          detalle: `${formato.pesos(s.precio)}, ${formato.duracion(s.duracionMin)}`,
        })
      )
    );
  }

  /* Paso 2: barbero ----------------------------------------------------- */
  function pintarBarberos() {
    $("opciones-barbero").replaceChildren(
      ...data.barberos.map((b) => {
        const hace = b.servicios.includes(estado.servicioId);
        return opcion({
          nombre: "barbero",
          valor: b.id,
          marcado: b.id === estado.barberoId,
          deshabilitado: !hace,
          titulo: b.nombre,
          detalle: hace ? b.especialidad : "No hace este servicio",
        });
      })
    );
  }

  /* Paso 3: día y hora -------------------------------------------------- */
  function proximosDias() {
    const hoy = agenda.inicioDelDia(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() + i);
      return d;
    });
  }

  function franjasDe(fecha) {
    return agenda.franjasDisponibles({
      negocio: data.negocio,
      barbero: buscar.barbero(estado.barberoId),
      servicio: buscar.servicio(estado.servicioId),
      fecha,
      turnos: util.todosLosTurnos(),
    });
  }

  function pintarDias() {
    const dias = proximosDias();
    if (!estado.fecha) {
      const primero = dias.find((d) => franjasDe(d).length);
      estado.fecha = primero || dias[0];
    }
    $("opciones-dia").replaceChildren(
      ...dias.map((d) => {
        const libres = franjasDe(d).length;
        const seleccionado = d.getTime() === estado.fecha.getTime();
        return crear(
          "button",
          {
            type: "button",
            clase: "dia",
            "aria-pressed": String(seleccionado),
            disabled: libres === 0,
            "aria-label": `${formato.fechaLarga(d)}, ${libres ? libres + " horas libres" : "sin horas libres"}`,
            onclick: () => {
              estado.fecha = d;
              estado.inicio = null;
              pintarDias();
              pintarFranjas();
              actualizarResumen();
              actualizarBotones();
            },
          },
          [
            crear("small", { texto: formato.diaRelativo(d) === "Hoy" ? "Hoy" : formato.diaCorto(d) }),
            crear("strong", { texto: String(d.getDate()) }),
            crear("small", { texto: libres ? `${libres} libres` : agenda.esDiaHabil(data.negocio, d) ? "Sin cupo" : "Cerrado" }),
          ]
        );
      })
    );
  }

  function pintarFranjas() {
    const franjas = franjasDe(estado.fecha);
    const contenedor = $("opciones-hora");
    if (!franjas.length) {
      contenedor.replaceChildren(crear("p", { clase: "franjas__vacio", texto: "No quedan horas libres este día. Prueba con otro día o con otro barbero." }));
      return;
    }
    contenedor.replaceChildren(
      ...franjas.map((f) =>
        crear("button", {
          type: "button",
          clase: "franja",
          "aria-pressed": String(estado.inicio && estado.inicio.getTime() === f.inicio.getTime()),
          texto: formato.hora(f.inicio),
          onclick: () => {
            estado.inicio = f.inicio;
            pintarFranjas();
            actualizarResumen();
            actualizarBotones();
          },
        })
      )
    );
  }

  /* Resumen (ticket) ---------------------------------------------------- */
  function ponerDato(id, valor) {
    const dd = $(id);
    dd.textContent = valor || "Sin elegir";
    dd.classList.toggle("is-vacio", !valor);
  }

  function actualizarResumen() {
    const s = buscar.servicio(estado.servicioId);
    const b = buscar.barbero(estado.barberoId);
    ponerDato("resumen-servicio", s && s.nombre);
    ponerDato("resumen-barbero", b && b.nombre);
    ponerDato("resumen-fecha", estado.inicio && formato.fechaLarga(estado.inicio));
    ponerDato("resumen-hora", estado.inicio && `${formato.hora(estado.inicio)} a ${formato.hora(agenda.sumarMinutos(estado.inicio, s.duracionMin))}`);
    $("resumen-total").textContent = formato.pesos(s ? s.precio : 0);
  }

  /* Paso 4: validación de datos ---------------------------------------- */
  function validarCampo(input, errorId, mensaje) {
    const valido = !mensaje;
    input.setAttribute("aria-invalid", String(!valido));
    if (!valido) input.setAttribute("aria-describedby", errorId);
    else input.removeAttribute("aria-describedby");
    $(errorId).textContent = mensaje || "";
    return valido;
  }

  function validarDatos(enfocar = true) {
    const nombre = $("cliente-nombre");
    const celular = $("cliente-celular");
    const textoNombre = nombre.value.trim();
    const digitos = celular.value.replace(/\D/g, "");

    const okNombre = validarCampo(
      nombre,
      "error-nombre",
      textoNombre.length < 3 ? "Escribe tu nombre (mínimo 3 letras)." : !/^[\p{L} .'-]+$/u.test(textoNombre) ? "Usa solo letras y espacios." : ""
    );
    const okCelular = validarCampo(
      celular,
      "error-celular",
      !/^3\d{9}$/.test(digitos) ? "Escribe un celular colombiano de 10 dígitos que empiece por 3." : ""
    );
    if (enfocar && !okNombre) nombre.focus();
    else if (enfocar && !okCelular) celular.focus();
    return okNombre && okCelular;
  }

  /* Confirmación -------------------------------------------------------- */
  function confirmar(evento) {
    evento.preventDefault();
    if (!validarDatos()) return;

    const servicio = buscar.servicio(estado.servicioId);
    const barbero = buscar.barbero(estado.barberoId);
    const resultado = agenda.validarReserva({
      negocio: data.negocio,
      barbero,
      servicio,
      inicio: estado.inicio,
      turnos: util.todosLosTurnos(),
    });

    if (!resultado.ok) {
      $("error-reserva").textContent = resultado.motivo;
      estado.inicio = null;
      irAPaso(3);
      actualizarResumen();
      return;
    }

    const misTurnos = storage.misTurnos();
    const turno = {
      id: Date.now(),
      codigo: `${barbero.iniciales.charAt(0)}-${String(misTurnos.length + 1 + Math.floor(Math.random() * 80)).padStart(2, "0")}`,
      cliente: $("cliente-nombre").value.trim(),
      celular: $("cliente-celular").value.replace(/\D/g, ""),
      nota: $("cliente-nota").value.trim(),
      barberoId: barbero.id,
      servicioId: servicio.id,
      inicio: estado.inicio.toISOString(),
      fin: resultado.fin.toISOString(),
      estado: "PENDIENTE",
      precio: servicio.precio,
      origen: "web",
    };
    misTurnos.push(turno);
    storage.guardarMisTurnos(misTurnos);
    document.dispatchEvent(new CustomEvent("corteya:turnos-cambiaron"));
    mostrarConfirmacion(turno);
  }

  function mostrarConfirmacion(turno) {
    const servicio = buscar.servicio(turno.servicioId);
    const barbero = buscar.barbero(turno.barberoId);
    const inicio = new Date(turno.inicio);
    $("conf-codigo").textContent = turno.codigo;
    $("conf-datos").replaceChildren(
      ...[
        ["Cliente", turno.cliente],
        ["Servicio", servicio.nombre],
        ["Barbero", barbero.nombre],
        ["Fecha", formato.fechaLarga(inicio)],
        ["Hora", formato.hora(inicio)],
      ].map(([dt, dd]) => crear("div", {}, [crear("dt", { texto: dt }), crear("dd", { texto: dd })]))
    );
    $("conf-total").textContent = formato.pesos(turno.precio);

    document.querySelector(".reserva__cuerpo").hidden = true;
    $("pasos").hidden = true;
    $("confirmacion").hidden = false;
    $("confirmacion").focus();
    util.avisar(`Turno reservado: ${formato.diaRelativo(inicio)}, ${formato.hora(inicio)}`);
  }

  function reiniciar() {
    Object.assign(estado, { paso: 1, servicioId: null, barberoId: null, fecha: null, inicio: null });
    $("form-reserva").reset();
    ["cliente-nombre", "cliente-celular"].forEach((id) => $(id).removeAttribute("aria-invalid"));
    ["error-nombre", "error-celular"].forEach((id) => ($(id).textContent = ""));
    document.querySelector(".reserva__cuerpo").hidden = false;
    $("pasos").hidden = false;
    $("confirmacion").hidden = true;
    pintarServicios();
    actualizarResumen();
    irAPaso(1);
  }

  /** Atajo desde las tarjetas de servicios y barberos. */
  function iniciarCon({ servicioId, barberoId }) {
    reiniciar();
    if (servicioId) estado.servicioId = servicioId;
    if (barberoId) estado.barberoId = barberoId;
    pintarServicios();
    actualizarResumen();
    irAPaso(servicioId ? 2 : 1);
    document.getElementById("reservar").scrollIntoView({ behavior: "smooth" });
  }

  /* Mis turnos ---------------------------------------------------------- */
  function sePuedeCancelar(turno) {
    const horas = (new Date(turno.inicio) - new Date()) / 3600000;
    return ["PENDIENTE", "CONFIRMADO"].includes(turno.estado) && horas >= HORAS_MINIMAS_CANCELAR;
  }

  function pintarMisTurnos() {
    const ids = new Set(storage.misTurnos().map((t) => t.id));
    const propios = util
      .todosLosTurnos()
      .filter((t) => ids.has(t.id))
      .sort((a, b) => new Date(a.inicio) - new Date(b.inicio));

    $("mis-turnos-vacio").hidden = propios.length > 0;
    $("btn-borrar").hidden = propios.length === 0;

    $("lista-mis-turnos").replaceChildren(
      ...propios.map((t) => {
        const inicio = new Date(t.inicio);
        const servicio = buscar.servicio(t.servicioId);
        const barbero = buscar.barbero(t.barberoId);
        const accion = sePuedeCancelar(t)
          ? crear("button", {
              type: "button",
              clase: "mini-boton mini-boton--peligro",
              texto: "Cancelar turno",
              onclick: () => {
                if (window.confirm(`¿Cancelar tu turno de ${servicio.nombre} el ${formato.fechaLarga(inicio)} a las ${formato.hora(inicio)}?`)) {
                  util.cambiarEstado(t.id, "CANCELADO");
                  util.avisar("Turno cancelado. La hora quedó libre para otra persona.");
                }
              },
            })
          : crear("span", { clase: `estado estado--${t.estado}`, texto: util.ETIQUETAS_ESTADO[t.estado] });

        return crear("li", { clase: "mi-turno" + (t.estado === "CANCELADO" ? " is-cancelado" : "") }, [
          crear("p", { clase: "mi-turno__fecha" }, [
            crear("strong", { texto: formato.hora(inicio).replace(/\s?[ap]\.\s?m\./, "") }),
            crear("span", { texto: `${formato.diaRelativo(inicio)} ${inicio.getDate()}` }),
          ]),
          crear("div", { clase: "mi-turno__info" }, [
            crear("p", { texto: `${servicio.nombre} con ${barbero.nombre}` }),
            crear("p", { texto: `Código ${t.codigo}, ${formato.fechaLarga(inicio).toLowerCase()} a las ${formato.hora(inicio)}. Valor: ${formato.pesos(t.precio)}` }),
            sePuedeCancelar(t) ? crear("p", {}, [crear("span", { clase: `estado estado--${t.estado}`, texto: util.ETIQUETAS_ESTADO[t.estado] })]) : null,
          ]),
          accion,
        ]);
      })
    );

    const activos = propios.filter((t) => ["PENDIENTE", "CONFIRMADO"].includes(t.estado) && new Date(t.fin) > new Date()).length;
    const contador = $("contador-turnos");
    contador.textContent = String(activos);
    contador.hidden = activos === 0;
  }

  /* Eventos ------------------------------------------------------------- */
  function iniciar() {
    pintarServicios();
    actualizarResumen();
    irAPaso(1);

    $("opciones-servicio").addEventListener("change", (e) => {
      estado.servicioId = Number(e.target.value);
      const b = buscar.barbero(estado.barberoId);
      if (b && !b.servicios.includes(estado.servicioId)) estado.barberoId = null;
      estado.inicio = null;
      estado.fecha = null;
      actualizarResumen();
      actualizarBotones();
    });

    $("opciones-barbero").addEventListener("change", (e) => {
      estado.barberoId = Number(e.target.value);
      estado.inicio = null;
      estado.fecha = null;
      actualizarResumen();
      actualizarBotones();
    });

    $("btn-siguiente").addEventListener("click", () => {
      if (pasoCompleto(estado.paso)) irAPaso(estado.paso + 1);
    });
    $("btn-atras").addEventListener("click", () => irAPaso(estado.paso - 1));
    $("form-reserva").addEventListener("submit", confirmar);
    $("btn-otra").addEventListener("click", () => {
      reiniciar();
      $("reservar").scrollIntoView({ behavior: "smooth" });
    });

    // Al escribir, se quita el error del campo corregido
    ["cliente-nombre", "cliente-celular"].forEach((id) =>
      $(id).addEventListener("input", (e) => {
        if (e.target.getAttribute("aria-invalid") === "true") validarDatos(false);
      })
    );

    $("btn-borrar").addEventListener("click", () => {
      if (window.confirm("Se borrarán tus turnos y los cambios hechos en el panel. ¿Continuar?")) {
        storage.borrarTodo();
        document.dispatchEvent(new CustomEvent("corteya:turnos-cambiaron"));
        util.avisar("Demostración reiniciada.");
      }
    });

    pintarMisTurnos();
    document.addEventListener("corteya:turnos-cambiaron", pintarMisTurnos);
  }

  app.reserva = { iniciar, iniciarCon };
})(window.CorteYa);
