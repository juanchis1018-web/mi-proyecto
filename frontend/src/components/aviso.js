/** Aviso flotante (toast) para confirmar acciones o informar errores. */
let temporizador;

export function avisar(mensaje, tipo = "info") {
  const aviso = document.getElementById("aviso");
  if (!aviso) return;
  aviso.textContent = mensaje;
  aviso.dataset.tipo = tipo;
  aviso.classList.add("is-visible");
  clearTimeout(temporizador);
  temporizador = setTimeout(() => aviso.classList.remove("is-visible"), tipo === "error" ? 5000 : 3200);
}

export const avisarError = (error) => avisar(error && error.mensaje ? error.mensaje : "Ocurrió un error inesperado.", "error");
