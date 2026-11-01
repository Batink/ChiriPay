const express = require("express");
const router = express.Router();
const BusControlador = require("../controladores/bus");

router.post("/buses", BusControlador.crear);
router.get("/buses", BusControlador.listar);
router.get("/buses/:id", BusControlador.listar_uno);
router.put("/buses/:id", BusControlador.editar);
router.delete("/buses/:id", BusControlador.borrar);

module.exports = router;    