const express = require("express");
const router = express.Router();
const ChoferControlador = require("../controladores/chofer");

router.post("/choferes", ChoferControlador.crear);
router.get("/choferes", ChoferControlador.listar);
router.get("/choferes/:id", ChoferControlador.listar_uno);
router.put("/choferes/:id", ChoferControlador.editar);
router.delete("/choferes/:id", ChoferControlador.borrar);

module.exports = router;
