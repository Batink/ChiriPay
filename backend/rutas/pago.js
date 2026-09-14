const express = require("express");
const router = express.Router();
const PagoControlador = require("../controladores/pago");

router.get("/ver-pos", PagoControlador.verMiPOS);
router.get("/pagos", PagoControlador.listarPagos);

router.post("/pasaje-escolar", PagoControlador.pasajeEscolar);
router.post("/pasaje-adulto", PagoControlador.pasajeAdulto);
router.post("/guardar-pago", PagoControlador.guardarPago);

module.exports = router;