const { Schema, model } = require("mongoose");

// Guarda un único documento: la última orden creada (pasaje escolar o adulto).
// La pantalla del QR (/qr) consulta este documento en vez de depender de la
// navegación del navegador, así funciona aunque esté abierta en otra ventana
// o en otro dispositivo distinto al que generó el pasaje.
const OrdenActualSchema = Schema({
    externalReference: {
        type: String
    },
    qrData: {
        type: String
    },
    titulo: {
        type: String
    },
    monto: {
        type: String
    },
    creadoEn: {
        type: Date,
        default: Date.now
    }
});

module.exports = model("OrdenActual", OrdenActualSchema, "orden_actual");
