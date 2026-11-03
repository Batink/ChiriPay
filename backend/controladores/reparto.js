const Reparto = require("../modelos/Reparto");
const { validarReparto } = require("../util/validar");
const { porcentajeVigente } = require("../util/reparto");

// GET /reparto : porcentaje que recibe el chofer (el resto va a la empresa)
const obtener = async (req, res) => {

    try {
        const porcentajeChofer = await porcentajeVigente();

        return res.status(200).json({
            status: "éxito",
            porcentajeChofer
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al obtener la división de las ganancias",
            error: error.message
        });
    }
}

// PUT /reparto  { porcentajeChofer } : se aplica solo a las ventas posteriores
const guardar = async (req, res) => {

    let datos;
    try {
        datos = validarReparto(req.body || {});
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }

    try {
        // Un único documento: si no existe se crea (upsert con filtro vacío)
        const resultado = await Reparto.findOneAndUpdate({}, {
            porcentajeChofer: datos.porcentajeChofer,
            fecha_actualizacion: new Date()
        }, {
            upsert: true,
            returnDocument: "after",
            runValidators: true
        });

        return res.status(200).json({
            status: "éxito",
            porcentajeChofer: resultado.porcentajeChofer,
            mensaje: "División guardada!!"
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al guardar la división de las ganancias",
            error: error.message
        });
    }
}

module.exports = {
    obtener,
    guardar
}
