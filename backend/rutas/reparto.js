const express = require("express");
const router = express.Router();
const RepartoControlador = require("../controladores/reparto");

router.get("/reparto", RepartoControlador.obtener);
router.put("/reparto", RepartoControlador.guardar);

module.exports = router;