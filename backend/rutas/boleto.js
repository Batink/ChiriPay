const express = require("express");
const router = express.Router();
const BoletoControlador = require("../controladores/boleto");

router.get("/boletos", BoletoControlador.listar);

module.exports = router;