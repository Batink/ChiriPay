const { randomUUID } = require("crypto");
const Bus = require("../modelos/Bus");
const { validarBus, validarIdBus } = require("../util/validar");

// CRUD de buses. Cada bus es un POS (punto de venta) de Mercado Pago:
//   crear  -> POST   /v2/pos
//   editar -> PATCH  /v2/pos/{pos_id}  (solo si cambia nombre o external_id)
//   borrar -> baja lógica: NO llama a Mercado Pago. El POS (y el QR pegado en
//             el bus) se conserva para poder reactivar el bus después.
// Listar y listar_uno leen directo de Mongo (no hace falta llamar a Mercado Pago).
//
// Variables de entorno (.env):
//   MP_ACCESS_TOKEN       (ya la usas en controladores/pago.js)
//   MP_STORE_ID           id de la sucursal en Mercado Pago (solo dígitos)
//   MP_EXTERNAL_STORE_ID  alternativa a MP_STORE_ID: el external_id de la sucursal

const MP_POS_URL = "https://api.mercadopago.com/v2/pos";

// Mercado Pago exige indicar la sucursal (store) a la que pertenece el POS.
const datosTienda = () => {
    if (process.env.MP_STORE_ID) {
        return { store_id: process.env.MP_STORE_ID };
    }
    if (process.env.MP_EXTERNAL_STORE_ID) {
        return { external_store_id: process.env.MP_EXTERNAL_STORE_ID };
    }
    return null;
};

const faltaConfiguracion = (res) => {
    return res.status(500).json({
        status: "error",
        mensaje: "Falta configurar MP_ACCESS_TOKEN y MP_STORE_ID (o MP_EXTERNAL_STORE_ID) en el .env"
    });
};

// Llamada genérica a la API de POS de Mercado Pago. Devuelve { ok, status, data }
// sin lanzar error por códigos 4xx/5xx, para decidir en cada acción qué hacer.
const llamarMP = async (metodo, ruta, cuerpo) => {
    const headers = {
        "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
    };

    // POST, PATCH y DELETE exigen X-Idempotency-Key (entre 1 y 64 caracteres)
    if (metodo !== "GET") {
        headers["X-Idempotency-Key"] = randomUUID();
    }

    const respuesta = await fetch(`${MP_POS_URL}${ruta}`, {
        method: metodo,
        headers,
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });

    // El DELETE exitoso responde 204 sin body
    const texto = await respuesta.text();
    let data = null;
    try {
        data = texto ? JSON.parse(texto) : null;
    } catch (error) {
        data = { message: texto };
    }

    return { ok: respuesta.ok, status: respuesta.status, data };
};

// Traduce una respuesta de error de Mercado Pago a una respuesta nuestra.
// Los 401 / 424 / 5xx no son culpa de los datos enviados por el cliente (token
// inválido, falla de Mercado Pago), así que se devuelven como 502.
const errorMP = (res, mp, mensaje) => {
    const status = (mp.status === 401 || mp.status === 424 || mp.status >= 500) ? 502 : mp.status;
    return res.status(status).json({
        status: "error",
        mensaje,
        detalle_mp: mp.data
    });
};

// Convierte el POS que devuelve Mercado Pago en los campos de nuestro modelo.
// "respaldo" trae los valores que enviamos, por si la respuesta no los incluye.
const datosDesdeMP = (pos, respaldo) => {
    const qr = pos.qr_response || {};
    return {
        nombre: pos.name ?? respaldo.nombre,
        external_id: pos.external_id ?? respaldo.external_id,
        mp_status: pos.status ?? "active",
        qr: {
            uuid: qr.uuid,
            image: qr.image,
            template_document: qr.template_document,
            template_image: qr.template_image,
            qr_code: qr.qr_code
        },
        fecha_actualizacion: new Date()
    };
};

const crear = async (req, res) => {

    // Obtener parametros por post a guardar y validar datos
    let datos;
    try {
        datos = validarBus(req.body || {});
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }

    const tienda = datosTienda();
    if (!process.env.MP_ACCESS_TOKEN || !tienda) {
        return faltaConfiguracion(res);
    }

    try {
        // Revisar duplicados ANTES de crear el POS en Mercado Pago
        const duplicado = await Bus.findOne({
            $or: [{ patente: datos.patente }, { external_id: datos.external_id }]
        });

        if (duplicado) {
            const campo = duplicado.patente === datos.patente ? "patente" : "external_id";
            // La baja es lógica, así que el bus sigue ocupando su patente y su external_id
            const sugerencia = duplicado.activo === false ? " (está dado de baja: reactívalo en vez de crearlo)" : "";
            return res.status(409).json({
                status: "error",
                mensaje: `Ya existe un bus con esa ${campo}${sugerencia}`
            });
        }

        // Crear el POS en Mercado Pago
        const mp = await llamarMP("POST", "", {
            name: datos.nombre,
            external_id: datos.external_id,
            ...tienda
        });

        if (!mp.ok) {
            return errorMP(res, mp, "Mercado Pago no pudo crear el POS del bus");
        }

        const pos = mp.data;

        // Guardar el bus en la base de datos
        try {
            const bus = await Bus.create({
                patente: datos.patente,
                mp_pos_id: pos.id,
                ...datosDesdeMP(pos, datos)
            });

            return res.status(201).json({
                status: "éxito",
                bus,
                mensaje: "Bus creado con éxito!!"
            });

        } catch (errorGuardar) {
            // Si falla el guardado, deshacer el POS recién creado para no dejar
            // un POS huérfano en Mercado Pago (se intenta, pero no es crítico).
            await llamarMP("DELETE", `/${pos.id}`).catch(() => { });
            throw errorGuardar;
        }

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al crear el bus",
            error: error.message
        });
    }
}

const listar = async (req, res) => {

    try {
        const resultado = await Bus.find({}).sort({ fecha: -1 });

        return res.status(200).json({
            status: "éxito",
            contador: resultado.length,
            resultado
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al listar los buses",
            error: error.message
        });
    }
}

const listar_uno = async (req, res) => {

    // Recoger un id por la url y validarlo
    try {
        validarIdBus(req.params.id);
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }

    try {
        const resultado = await Bus.findById(req.params.id);

        if (!resultado) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se ha encontrado el bus"
            });
        }

        return res.status(200).json({
            status: "éxito",
            resultado
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al buscar el bus",
            error: error.message
        });
    }
}

// Acepta cambios parciales: patente, nombre, external_id y/o activo.
// La patente y activo son solo nuestros; nombre y external_id también se
// actualizan en el POS de Mercado Pago. activo:true reactiva un bus dado de baja.
const editar = async (req, res) => {

    const busId = req.params.id;

    let cambios;
    try {
        validarIdBus(busId);
        cambios = validarBus(req.body || {}, { parcial: true });
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

        // Revisar que patente / external_id nuevos no los tenga otro bus
        const filtros = [];
        if (cambios.patente && cambios.patente !== bus.patente) {
            filtros.push({ patente: cambios.patente });
        }
        if (cambios.external_id && cambios.external_id !== bus.external_id) {
            filtros.push({ external_id: cambios.external_id });
        }

        if (filtros.length > 0) {
            const duplicado = await Bus.findOne({ $or: filtros, _id: { $ne: bus._id } });
            if (duplicado) {
                const campo = cambios.patente && duplicado.patente === cambios.patente ? "patente" : "external_id";
                return res.status(409).json({
                    status: "error",
                    mensaje: `Ya existe otro bus con esa ${campo}`
                });
            }
        }

        let actualizacion = { ...cambios, fecha_actualizacion: new Date() };

        // fecha_baja acompaña a activo: se marca al dar de baja y se limpia al reactivar
        if (cambios.activo === false && bus.activo !== false) {
            actualizacion.fecha_baja = new Date();
        } else if (cambios.activo === true) {
            actualizacion.fecha_baja = null;
        }

        // Solo se llama a Mercado Pago si cambió algo que vive en el POS
        const cambiaPOS =
            (cambios.nombre && cambios.nombre !== bus.nombre) ||
            (cambios.external_id && cambios.external_id !== bus.external_id);

        if (cambiaPOS) {
            const tienda = datosTienda();
            if (!process.env.MP_ACCESS_TOKEN || !tienda) {
                return faltaConfiguracion(res);
            }

            // En el PATCH hay que enviar también la sucursal (store)
            const cuerpo = { ...tienda };
            if (cambios.nombre) cuerpo.name = cambios.nombre;
            if (cambios.external_id) cuerpo.external_id = cambios.external_id;

            const mp = await llamarMP("PATCH", `/${bus.mp_pos_id}`, cuerpo);

            if (!mp.ok) {
                return errorMP(res, mp, "Mercado Pago no pudo actualizar el POS del bus");
            }

            actualizacion = {
                ...actualizacion,
                ...datosDesdeMP(mp.data, {
                    nombre: cambios.nombre ?? bus.nombre,
                    external_id: cambios.external_id ?? bus.external_id
                })
            };
        }

        const resultado = await Bus.findByIdAndUpdate(busId, actualizacion, {
            returnDocument: "after",
            runValidators: true
        });

        return res.status(200).json({
            status: "éxito",
            bus: resultado,
            mensaje: "Bus actualizado!!"
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al actualizar el bus",
            error: error.message
        });
    }
}

// Baja lógica: el bus queda con activo:false y su historial (pagos, patente,
// external_id) se conserva. Para reactivarlo: PUT /buses/:id con { activo: true }.
const borrar = async (req, res) => {

    // Recoger un id por la url y validarlo
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

        if (bus.activo === false) {
            return res.status(409).json({
                status: "error",
                mensaje: "El bus ya está dado de baja"
            });
        }

        const ahora = new Date();
        const resultado = await Bus.findByIdAndUpdate(busId, {
            activo: false,
            fecha_baja: ahora,
            fecha_actualizacion: ahora
        }, {
            returnDocument: "after"
        });

        return res.status(200).json({
            status: "éxito",
            bus: resultado,
            mensaje: "Bus dado de baja"
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al dar de baja el bus",
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