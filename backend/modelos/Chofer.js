// Es como realizar un import, aquí añadimos o incorporamos la dependencia
// de mongoose al archivo o modelo implementado.
const { Schema, model } = require("mongoose");

// Los buses apuntan a su chofer vigente con Bus.choferId (ver modelos/Bus.js).
// Un chofer puede estar en varios buses a la vez.
const ChoferSchema = new Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    // RUT normalizado, sin puntos y con guion ("12345678-5"). Es la única clave única.
    rut: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    correo: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    // ID de la cuenta de Mercado Pago del chofer, para transferirle su parte
    // de las ganancias. Se guarda como texto para no perder ceros ni precisión.
    cuenta: {
        type: String,
        required: true,
        trim: true
    },
    // Disponibilidad (Activo / Inactivo). Es independiente de la baja.
    activo: {
        type: Boolean,
        default: true
    },
    // Baja lógica: el chofer deja de usarse pero su historial se conserva y el
    // RUT queda reservado. Al darlo de baja también queda activo:false.
    baja: {
        type: Boolean,
        default: false
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

module.exports = model("Chofer", ChoferSchema, "choferes");
