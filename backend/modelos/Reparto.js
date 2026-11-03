const { Schema, model } = require("mongoose");

// Configuración de cómo se reparten las ganancias. Es un único documento (como
// OrdenActual): el porcentaje que se queda el chofer; el resto es de la empresa.
// Cada venta guarda el porcentaje con que se hizo (ver modelos/Orden.js), así que
// cambiarlo solo afecta a las ventas posteriores.
const RepartoSchema = new Schema({
    porcentajeChofer: {
        type: Number,
        required: true,
        min: 0,
        max: 100,
        default: 20
    },
    fecha_actualizacion: {
        type: Date
    }
});

module.exports = model("Reparto", RepartoSchema, "reparto");