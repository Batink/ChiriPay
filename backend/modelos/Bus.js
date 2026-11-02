// Es como realizar un import, aquí añadimos o incorporamos la dependencia
// de mongoose al archivo o modelo implementado.
const { Schema, model } = require("mongoose");

// Cada bus tiene asociado un POS (punto de venta) en Mercado Pago. De ese POS
// salen el QR y el external_id, que es el valor que se manda como
// "external_pos_id" cuando se crea una orden (ver controladores/pago.js).
const BusSchema = new Schema({
    patente: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    // Nombre del POS en Mercado Pago (ej: "Bus 12 Recorrido 401")
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    // Identificador externo del POS, definido por nosotros (ej: "TRC001POS001")
    external_id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // ID numérico que Mercado Pago asigna al POS al crearlo
    mp_pos_id: {
        type: Number,
        required: true,
        unique: true
    },
    // "active" o "inactive", tal como lo informa Mercado Pago
    mp_status: {
        type: String,
        default: "active"
    },
    // Datos del QR estático que Mercado Pago genera junto con el POS
    qr: {
        uuid: { type: String },
        image: { type: String },
        template_document: { type: String },
        template_image: { type: String },
        qr_code: { type: String }
    },
    // Chofer vigente del bus (null = bus sin chofer). Solo se modifica con los
    // endpoints de vinculación (Fase 3), no con crear/editar: por eso validarBus
    // no lo acepta. El historial de asignaciones se guardará aparte.
    choferId: {
        type: Schema.Types.ObjectId,
        ref: "Chofer",
        default: null
    },
    // Baja lógica: false = bus dado de baja. Los pagos históricos siguen
    // apuntando al bus, y la patente / external_id quedan reservados.
    activo: {
        type: Boolean,
        default: true
    },
    fecha_baja: {
        type: Date,
        default: null
    },
    fecha: {
        type: Date,
        default: Date.now
    },
    fecha_actualizacion: {
        type: Date
    }
});

module.exports = model("Bus", BusSchema, "buses");