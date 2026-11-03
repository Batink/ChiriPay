const Asignacion = require("../modelos/Asignacion");

// Operaciones sobre el historial de asignaciones que comparten varios
// controladores (asignar/desasignar, baja de un bus, baja de un chofer).
// Ninguna toca Bus.choferId: eso lo hace cada controlador en el mismo paso.

// Cierra la asignación vigente de un bus. Devuelve cuántas cerró (0 o 1).
const cerrarDeBus = async (busId, ahora = new Date()) => {
    const resultado = await Asignacion.updateMany(
        { busId, vigente: true },
        { vigente: false, hasta: ahora }
    );
    return resultado.modifiedCount;
};

// Cierra todas las asignaciones vigentes de un chofer (puede manejar varios buses).
const cerrarDeChofer = async (choferId, ahora = new Date()) => {
    const resultado = await Asignacion.updateMany(
        { choferId, vigente: true },
        { vigente: false, hasta: ahora }
    );
    return resultado.modifiedCount;
};

const abrir = (busId, choferId, ahora = new Date()) => {
    return Asignacion.create({ busId, choferId, desde: ahora });
};

module.exports = {
    cerrarDeBus,
    cerrarDeChofer,
    abrir
};
