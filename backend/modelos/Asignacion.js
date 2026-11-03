// Es como realizar un import, aquí añadimos o incorporamos la dependencia
// de mongoose al archivo o modelo implementado.
const { Schema, model } = require("mongoose");

// Historial de qué chofer manejó qué bus y desde cuándo hasta cuándo.
// La asignación vigente de un bus es la que tiene vigente:true (Bus.choferId es
// su copia rápida). Al cambiar o quitar el chofer no se borra nada: la
// asignación se cierra (vigente:false, hasta:<fecha>) y, si corresponde, se abre otra.
const AsignacionSchema = new Schema({
    busId: {
        type: Schema.Types.ObjectId,
        ref: "Bus",
        required: true
    },
    choferId: {
        type: Schema.Types.ObjectId,
        ref: "Chofer",
        required: true
    },
    desde: {
        type: Date,
        default: Date.now
    },
    // null mientras la asignación siga vigente
    hasta: {
        type: Date,
        default: null
    },
    vigente: {
        type: Boolean,
        default: true
    }
});

// Un bus no puede tener dos asignaciones vigentes, ni siquiera si dos peticiones
// llegan a la vez. (Un chofer SÍ puede tener varias: maneja más de un bus.)
AsignacionSchema.index({ busId: 1 }, { unique: true, partialFilterExpression: { vigente: true } });
AsignacionSchema.index({ choferId: 1, vigente: 1 });
AsignacionSchema.index({ busId: 1, desde: -1 });

module.exports = model("Asignacion", AsignacionSchema, "asignaciones");