const { Schema, model } = require("mongoose");

// Guarda un documento POR BUS: la última orden creada en ese bus (pasaje escolar
// o adulto). La pantalla del QR de cada bus (/qr?bus=PATENTE) consulta su
// documento en vez de depender de la navegación del navegador, así funciona
// aunque esté abierta en otra ventana o en otro dispositivo.
const OrdenActualSchema = Schema({
    busId: {
        type: Schema.Types.ObjectId,
        ref: "Bus",
        unique: true,
        sparse: true // el documento único de antes de existir los buses no tiene busId
    },
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