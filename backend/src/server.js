/** Punto de entrada: prepara la base de datos y levanta el servidor HTTP. */
import { config } from "./config/index.js";
import { sequelize } from "./models/index.js";
import { sembrar, estaVacia } from "./db/sembrar.js";
import { crearApp } from "./app.js";

async function iniciar() {
  await sequelize.authenticate();
  await sequelize.sync();
  if (config.sembrarDatos && (await estaVacia())) {
    await sembrar();
    console.log("Base de datos vacía: se cargaron los datos de demostración.");
  }

  const servidor = crearApp().listen(config.puerto, () => {
    console.log(`CorteYa disponible en http://localhost:${config.puerto}`);
    console.log(`Documentación de la API en http://localhost:${config.puerto}/api/docs`);
  });

  const cerrar = async () => {
    servidor.close();
    await sequelize.close();
    process.exit(0);
  };
  process.on("SIGTERM", cerrar);
  process.on("SIGINT", cerrar);
}

iniciar().catch((error) => {
  console.error("No se pudo iniciar CorteYa:", error.message);
  process.exit(1);
});
