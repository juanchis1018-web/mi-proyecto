/** Indicadores del día para el panel del administrador. */
import { Op } from "sequelize";
import { Turno } from "../models/index.js";
import { listarBarberos } from "./catalogoService.js";
import { resumenDelDia } from "../../../shared/reportes.js";
import { desdeISOFecha, inicioDelDia } from "../../../shared/agenda.js";
import { ErrorHttp } from "../utils/errores.js";

export async function resumen({ fecha } = {}) {
  const dia = fecha ? desdeISOFecha(fecha) : inicioDelDia(new Date());
  if (!dia) throw new ErrorHttp(400, "La fecha debe tener el formato AAAA-MM-DD.");
  const siguiente = new Date(dia);
  siguiente.setDate(dia.getDate() + 1);

  const [turnos, barberos] = await Promise.all([
    Turno.findAll({ where: { inicio: { [Op.gte]: dia, [Op.lt]: siguiente } }, attributes: ["barberoId", "servicioId", "inicio", "fin", "estado", "precio"] }),
    listarBarberos({ todos: true }),
  ]);
  return resumenDelDia({ fecha: dia, turnos: turnos.map((t) => t.get({ plain: true })), barberos });
}
