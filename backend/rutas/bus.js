const express = require("express");
const router = express.Router();
const BusControlador = require("../controladores/bus");
const AsignacionControlador = require("../controladores/asignacion");

router.post("/buses", BusControlador.crear);
router.get("/buses", BusControlador.listar);
router.get("/buses/:id", BusControlador.listar_uno);
router.put("/buses/:id", BusControlador.editar);
router.delete("/buses/:id", BusControlador.borrar);

// Vinculación con el chofer
router.get("/buses/:id/asignaciones", AsignacionControlador.historial);
router.put("/buses/:id/chofer", AsignacionControlador.asignar);
router.delete("/buses/:id/chofer", AsignacionControlador.desasignar);

module.exports = router;    
