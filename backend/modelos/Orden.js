const { Schema, model } = require("mongoose");

// Una orden por cada QR que genera un dispositivo. Guarda a qué bus y a qué
// chofer pertenece la venta y con qué porcentaje se reparte, FIJADOS al momento
// de crear el QR: si después se cambia el chofer del bus o el porcentaje, esta
// venta no cambia. Cuando llega el webhook del pago (controladores/pago.js,
// guardarPago) se busca esta orden por external_reference y esos datos se copian al Pago.
const OrdenSchema = new Schema({
    externalReference: {
        type: String,
        required: true,
        unique: true
    },
    busId: {
        type: Schema.Types.ObjectId,
        ref: "Bus",
        required: true
    },
    // Chofer asignado al bus cuando se creó el QR (null = el bus no tenía chofer)
    choferId: {
        type: Schema.Types.ObjectId,
        ref: "Chofer",
        default: null
    },
    // Porcentaje del chofer vigente en ese momento. 0 si el bus no tenía chofer:
    // todo el monto va a la empresa.
    porcentaje_chofer: {
        type: Number,
        required: true,
        min: 0,
        max: 100
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

module.exports = model("Orden", OrdenSchema, "ordenes");