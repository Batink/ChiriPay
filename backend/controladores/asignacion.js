const Bus = require("../modelos/Bus");
const Chofer = require("../modelos/Chofer");
const Asignacion = require("../modelos/Asignacion");
const { validarIdBus, validarAsignacion } = require("../util/validar");
const { cerrarDeBus, abrir } = require("../util/asignaciones");

// Vinculación bus <-> chofer.
//  - Un bus tiene como máximo UN chofer vigente (puede no tener ninguno).
//  - Un chofer puede manejar varios buses a la vez.
//  - Asignar a un bus que ya tiene chofer REEMPLAZA al anterior: su asignación
//    se cierra en el historial y se abre la nueva.
//  - Asignar a un chofer inactivo lo vuelve activo. Uno dado de baja no se puede asignar.
//  - Nada se borra: el historial (colección "asignaciones") queda para repartir
//    las ganancias según quién manejaba cada bus.
//
// Sin transacciones (Mongo puede estar sin replica set), los pasos van en un
// orden tal que, si uno falla, repetir la misma petición lo deja consistente.

const mismo = (a, b) => a != null && b != null && String(a) === String(b);

// PUT /buses/:id/chofer  { choferId }
const asignar = async (req, res) => {

    const busId = req.params.id;
    let datos;
    try {
        validarIdBus(busId);
        datos = validarAsignacion(req.body || {});
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }

    try {
        const bus = await Bus.findById(busId);
        if (!bus) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se ha encontrado el bus"
            });
        }
        if (bus.activo === false) {
            return res.status(409).json({
                status: "error",
                mensaje: "El bus está dado de baja: reactívalo antes de asignarle un chofer"
            });
        }

        const chofer = await Chofer.findById(datos.choferId);
        if (!chofer) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se ha encontrado el chofer"
            });
        }
        if (chofer.baja === true) {
            return res.status(409).json({
                status: "error",
                mensaje: "El chofer está dado de baja: reactívalo antes de asignarlo a un bus"
            });
        }

        const ahora = new Date();
        const vigente = await Asignacion.findOne({ busId: bus._id, vigente: true });

        // Ya está asignado solo si el historial y el bus coinciden. Si no (p. ej.
        // una petición anterior se cortó a medias), se reconstruye abajo.
        const yaAsignado = mismo(vigente?.choferId, chofer._id) && mismo(bus.choferId, chofer._id);

        const anterior = bus.choferId ?? vigente?.choferId ?? null;
        const reemplazado = anterior && !mismo(anterior, chofer._id) ? anterior : null;

        if (!yaAsignado) {
            await cerrarDeBus(bus._id, ahora);
            await abrir(bus._id, chofer._id, ahora);
        }

        const busActualizado = await Bus.findByIdAndUpdate(busId, {
            choferId: chofer._id,
            fecha_actualizacion: ahora
        }, { returnDocument: "after" });

        // Un chofer inactivo pasa a activo al asignarlo
        let choferActualizado = chofer;
        if (chofer.activo === false) {
            choferActualizado = await Chofer.findByIdAndUpdate(chofer._id, {
                activo: true,
                fecha_actualizacion: ahora
            }, { returnDocument: "after" });
        }

        return res.status(200).json({
            status: "éxito",
            bus: busActualizado,
            chofer: choferActualizado,
            chofer_reemplazado: reemplazado ? String(reemplazado) : null,
            mensaje: yaAsignado ? "El bus ya tenía asignado a ese chofer" : "Chofer asignado al bus"
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al asignar el chofer",
            error: error.message
        });
    }
}

// DELETE /buses/:id/chofer
const desasignar = async (req, res) => {

    const busId = req.params.id;
    try {
        validarIdBus(busId);
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }

    try {
        const bus = await Bus.findById(busId);
        if (!bus) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se ha encontrado el bus"
            });
        }

        const vigente = await Asignacion.findOne({ busId: bus._id, vigente: true });
        if (!bus.choferId && !vigente) {
            return res.status(409).json({
                status: "error",
                mensaje: "El bus no tiene un chofer asignado"
            });
        }

        const ahora = new Date();
        await cerrarDeBus(bus._id, ahora);

        const busActualizado = await Bus.findByIdAndUpdate(busId, {
            choferId: null,
            fecha_actualizacion: ahora
        }, { returnDocument: "after" });

        return res.status(200).json({
            status: "éxito",
            bus: busActualizado,
            mensaje: "Chofer desasignado del bus"
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al desasignar el chofer",
            error: error.message
        });
    }
}

// GET /buses/:id/asignaciones : historial del bus, la más reciente primero
const historial = async (req, res) => {

    try {
        validarIdBus(req.params.id);
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }

    try {
        const bus = await Bus.findById(req.params.id);
        if (!bus) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se ha encontrado el bus"
            });
        }

        const resultado = await Asignacion.find({ busId: bus._id }).sort({ desde: -1 });

        return res.status(200).json({
            status: "éxito",
            contador: resultado.length,
            resultado
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al obtener el historial de asignaciones",
            error: error.message
        });
    }
}

module.exports = {
    asignar,
    desasignar,
    historial
}
