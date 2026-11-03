const Chofer = require("../modelos/Chofer");
const Bus = require("../modelos/Bus");
const { validarChofer, validarIdChofer } = require("../util/validar");
const { cerrarDeChofer } = require("../util/asignaciones");

// CRUD de choferes. Todo vive en Mongo (no hay integración con Mercado Pago:
// la cuenta del chofer solo se guarda para transferirle en el futuro).
//   borrar -> baja lógica: el chofer queda con baja:true y se DESVINCULA de
//             todos sus buses. El historial se conserva y el RUT queda reservado.
// Para reactivar a un chofer dado de baja: PUT /choferes/:id con { baja: false }.

const rutDuplicado = (res, chofer) => {
    // La baja es lógica, así que el chofer sigue ocupando su RUT
    const sugerencia = chofer.baja === true ? " (está dado de baja: reactívalo en vez de crearlo)" : "";
    return res.status(409).json({
        status: "error",
        mensaje: `Ya existe un chofer con ese RUT${sugerencia}`
    });
};

// Código de error de Mongo para un índice único violado. Cubre la carrera en
// que dos peticiones con el mismo RUT pasan a la vez el chequeo previo.
const esDuplicadoMongo = (error) => error && error.code === 11000;

const crear = async (req, res) => {

    // Obtener parametros por post a guardar y validar datos
    let datos;
    try {
        datos = validarChofer(req.body || {});
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }

    try {
        const duplicado = await Chofer.findOne({ rut: datos.rut });
        if (duplicado) {
            return rutDuplicado(res, duplicado);
        }

        const chofer = await Chofer.create(datos);

        return res.status(201).json({
            status: "éxito",
            chofer,
            mensaje: "Chofer creado con éxito!!"
        });

    } catch (error) {
        if (esDuplicadoMongo(error)) {
            return rutDuplicado(res, {});
        }
        return res.status(500).json({
            status: "error",
            mensaje: "Error al crear el chofer",
            error: error.message
        });
    }
}

// Devuelve todos los choferes, también los dados de baja: los boletos antiguos
// siguen mostrando el nombre de quien manejaba.
const listar = async (req, res) => {

    try {
        const resultado = await Chofer.find({}).sort({ fecha: -1 });

        return res.status(200).json({
            status: "éxito",
            contador: resultado.length,
            resultado
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al listar los choferes",
            error: error.message
        });
    }
}

const listar_uno = async (req, res) => {

    // Recoger un id por la url y validarlo
    try {
        validarIdChofer(req.params.id);
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }

    try {
        const resultado = await Chofer.findById(req.params.id);

        if (!resultado) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se ha encontrado el chofer"
            });
        }

        return res.status(200).json({
            status: "éxito",
            resultado
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al buscar el chofer",
            error: error.message
        });
    }
}

// Acepta cambios parciales: nombre, rut, correo, cuenta, activo y/o baja:false.
// Un chofer dado de baja solo admite reactivarse (baja:false); al reactivarlo
// queda activo, salvo que en el mismo body se envíe activo:false.
const editar = async (req, res) => {

    const choferId = req.params.id;

    let cambios;
    try {
        validarIdChofer(choferId);
        cambios = validarChofer(req.body || {}, { parcial: true });
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }

    try {
        const chofer = await Chofer.findById(choferId);

        if (!chofer) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se ha encontrado el chofer"
            });
        }

        const reactivando = chofer.baja === true && cambios.baja === false;

        if (chofer.baja === true && !reactivando) {
            return res.status(409).json({
                status: "error",
                mensaje: "El chofer está dado de baja: reactívalo (baja: false) antes de modificarlo"
            });
        }

        // Revisar que el RUT nuevo no lo tenga otro chofer
        if (cambios.rut && cambios.rut !== chofer.rut) {
            const duplicado = await Chofer.findOne({ rut: cambios.rut, _id: { $ne: chofer._id } });
            if (duplicado) {
                return res.status(409).json({
                    status: "error",
                    mensaje: "Ya existe otro chofer con ese RUT"
                });
            }
        }

        const actualizacion = { ...cambios, fecha_actualizacion: new Date() };

        if (reactivando) {
            actualizacion.fecha_baja = null;
            actualizacion.activo = cambios.activo ?? true;
        } else {
            // baja:false sobre un chofer que no estaba de baja no cambia nada
            delete actualizacion.baja;
        }

        const resultado = await Chofer.findByIdAndUpdate(choferId, actualizacion, {
            returnDocument: "after",
            runValidators: true
        });

        return res.status(200).json({
            status: "éxito",
            chofer: resultado,
            mensaje: "Chofer actualizado!!"
        });

    } catch (error) {
        if (esDuplicadoMongo(error)) {
            return res.status(409).json({
                status: "error",
                mensaje: "Ya existe otro chofer con ese RUT"
            });
        }
        return res.status(500).json({
            status: "error",
            mensaje: "Error al actualizar el chofer",
            error: error.message
        });
    }
}

// Baja lógica + desvinculación automática de sus buses (decisión de negocio:
// no se bloquea la baja aunque el chofer esté asignado).
const borrar = async (req, res) => {

    // Recoger un id por la url y validarlo
    const choferId = req.params.id;
    try {
        validarIdChofer(choferId);
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }

    try {
        const chofer = await Chofer.findById(choferId);

        if (!chofer) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se ha encontrado el chofer"
            });
        }

        if (chofer.baja === true) {
            return res.status(409).json({
                status: "error",
                mensaje: "El chofer ya está dado de baja"
            });
        }

        const ahora = new Date();

        // Primero se desvincula (historial y buses) y después se marca la baja: si
        // algo falla a la mitad, repetir el DELETE lo termina bien y nunca queda
        // un chofer dado de baja asignado a un bus.
        await cerrarDeChofer(chofer._id, ahora);
        const desvinculacion = await Bus.updateMany(
            { choferId: chofer._id },
            { choferId: null, fecha_actualizacion: ahora }
        );

        const resultado = await Chofer.findByIdAndUpdate(choferId, {
            baja: true,
            activo: false,
            fecha_baja: ahora,
            fecha_actualizacion: ahora
        }, {
            returnDocument: "after"
        });

        return res.status(200).json({
            status: "éxito",
            chofer: resultado,
            buses_desvinculados: desvinculacion.modifiedCount,
            mensaje: "Chofer dado de baja"
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al dar de baja el chofer",
            error: error.message
        });
    }
}

module.exports = {
    crear,
    listar,
    listar_uno,
    editar,
    borrar
}