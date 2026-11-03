const fetch = require("node-fetch");
const { randomUUID } = require('crypto');
const Pago = require("../modelos/Pago");
const OrdenActual = require("../modelos/OrdenActual");
const Orden = require("../modelos/Orden");
const Bus = require("../modelos/Bus");
const { normalizarPatente } = require("../util/validar");
const { porcentajeVigente, calcularReparto } = require("../util/reparto");
 
// Cada bus tiene su propio dispositivo y su propia pantalla de QR, así que
// guardamos un documento por bus con su última orden creada (upsert por busId)
// en vez de llevar un historial. La pantalla del QR lo consulta por polling.
const guardarOrdenActual = async ({ busId, externalReference, qrData, titulo, monto }) => {
    await OrdenActual.findOneAndUpdate(
        { busId },
        { busId, externalReference, qrData, titulo, monto, creadoEn: new Date() },
        { upsert: true, returnDocument: "after" }
    );
};
 
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const POS_ID = process.env.MP_POS_ID;
 
if (!ACCESS_TOKEN) {
    console.warn("⚠️  Falta MP_ACCESS_TOKEN en el .env: las llamadas a Mercado Pago van a fallar.");
}
 
const listarPagos = async (req, res) => {
    try {
        const pagos = await Pago.find().sort({ date_created: -1 });
        return res.status(200).json({
            status: "Pagos obtenidos",
            total: pagos.length,
            pagos,
        });
 
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al listar pagos",
            error: error.message
        });
    }
};
 
const verMiPOS = async (req, res) => {
    try {
        const respuesta = await fetch(`https://api.mercadopago.com/pos/${POS_ID}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
 
        const data = await respuesta.json();
 
        return res.status(200).json(data);
 
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mensaje: "Error al llamar la API de MP" });
    }
};
 
// Los dispositivos identifican su bus por la patente (en la dirección:
// /?bus=AB1234). Devuelve { bus } o { codigo, mensaje } con el error a responder.
const resolverBus = async (valor) => {
    const patente = normalizarPatente(valor);
    if (!patente) {
        return { codigo: 400, mensaje: "Falta la patente del bus (patente), de 6 caracteres alfanuméricos" };
    }

    const bus = await Bus.findOne({ patente });
    if (!bus) {
        return { codigo: 404, mensaje: "No existe un bus con esa patente" };
    }
    if (bus.activo === false) {
        return { codigo: 409, mensaje: "El bus está dado de baja" };
    }

    return { bus };
};

// Crea el QR de un pasaje en el bus indicado. Antes había una función por tipo
// de pasaje con todo el código repetido y el POS fijo ("TRC001POS001") para
// todas las órdenes: ahora se usa el POS del bus (su external_id) y se guarda
// a qué bus y chofer pertenece la orden. La respuesta sigue siendo la de MP.
const crearPasaje = ({ prefijo, titulo, descripcion, monto }) => async (req, res) => {
    try {
        const { bus, codigo, mensaje } = await resolverBus(req.body && req.body.patente);
        if (!bus) {
            return res.status(codigo).json({ status: "error", mensaje });
        }

        const idempotencyKey = randomUUID();
 
        // Una referencia única por cada orden creada: así se sabe a qué compra
        // corresponde cada webhook de la colección de pagos.
        const externalReference = `${prefijo}-${randomUUID()}`;

        // Reparto de ESTA venta, fijado ahora: si el bus no tiene chofer, todo es de la empresa.
        const porcentaje_chofer = bus.choferId ? await porcentajeVigente() : 0;

        // Se guarda antes de pedir el QR: si el cliente paga, el webhook siempre
        // encuentra a qué bus y chofer corresponde.
        await Orden.create({
            externalReference,
            busId: bus._id,
            choferId: bus.choferId || null,
            porcentaje_chofer,
            titulo,
            monto
        });
 
        const respuesta = await fetch(`https://api.mercadopago.com/v1/orders`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": idempotencyKey
            },
            body: JSON.stringify({
 
                "type": "qr",
                "total_amount": monto,
                "description": descripcion,
                "external_reference": externalReference,
                "expiration_time": "PT5M",
                "config": {
                    "qr": {
                        "external_pos_id": bus.external_id,
                        "mode": "dynamic"
                    }
                },
                "transactions": {
                    "payments": [
                        {
                            "amount": monto
                        }
                    ]
                },
                "items": [{
                    "title": titulo,
                    "unit_price": monto,
                    "quantity": 1,
                    "unit_measure": "unit"
                }]
            })
        });
 
        const data = await respuesta.json();
 
        if (data && data.type_response && data.type_response.qr_data) {
            await guardarOrdenActual({
                busId: bus._id,
                externalReference: data.external_reference,
                qrData: data.type_response.qr_data,
                titulo,
                monto: data.total_amount
            });
        } else {
            // MP no generó el QR: la orden guardada no se va a pagar nunca
            await Orden.deleteOne({ externalReference }).catch(() => {});
        }
 
        return res.status(200).json(data);
 
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mensaje: "Error al llamar la API de MP" });
    }
};
 
const pasajeEscolar = crearPasaje({ prefijo: "PE", titulo: "Pasaje Escolar", descripcion: "Pasaje escolar", monto: "500" });
const pasajeAdulto = crearPasaje({ prefijo: "PA", titulo: "Pasaje Adulto", descripcion: "Pasaje adulto", monto: "1500" });
 
const guardarPago = async (req, res) => {
    try {
        // El webhook solo trae datos de Mercado Pago: el bus, el chofer y el reparto
        // los pone el backend a partir de la orden, no se aceptan desde el body.
        const { busId, choferId, porcentaje_chofer, monto_chofer, monto_empresa, ...parametros } = req.body || {};
        //validarCaduco(parametros);
 
        const pago = new Pago(parametros);

        const referencia = pago.data && pago.data.external_reference;
        const orden = referencia ? await Orden.findOne({ externalReference: referencia }) : null;

        if (orden) {
            // El monto se lee igual que en el panel: lo cobrado, o el de la primera transacción
            const transaccion = pago.data.transactions && pago.data.transactions.payments && pago.data.transactions.payments[0];
            const monto = Number(
                pago.data.total_paid_amount ?? (transaccion && (transaccion.paid_amount ?? transaccion.amount)) ?? 0
            );

            pago.busId = orden.busId;
            pago.choferId = orden.choferId;
            pago.porcentaje_chofer = orden.porcentaje_chofer;
            Object.assign(pago, calcularReparto(monto, orden.porcentaje_chofer));
        }

        const pagoGuardado = await pago.save();
 
        return res.status(200).json({
            status: "éxito",
            pago: pagoGuardado,
            mensaje: "Pago registrado con éxito!! GRAAAAAAAAAAAAAAAAAAAAAAAAAAAH"
        });
 
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }
}
 
// Consulta el estado de un pago a partir del external_reference generado
// al crear el pasaje. El webhook de MP (POST /webhook -> POST /api/guardar-pago)
// va guardando en la colección "pagos" cada actualización que llega, así que
// acá buscamos la más reciente que tenga esa misma referencia.
const consultarEstadoPago = async (req, res) => {
    try {
        const referencia = req.params.referencia;
 
        const pago = await Pago.findOne({ "data.external_reference": referencia })
            .sort({ date_created: -1 });
 
        if (!pago) {
            return res.status(200).json({
                status: "pendiente",
                mensaje: "Aún no se ha recibido el pago"
            });
        }
 
        return res.status(200).json({
            status: pago.data.status,               // p.ej. "processed"
            status_detail: pago.data.status_detail,  // p.ej. "accredited"
            monto: pago.data.total_paid_amount,
            pago
        });
 
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al consultar el estado del pago",
            error: error.message
        });
    }
};
 
// Devuelve la última orden creada en el bus indicado (?patente=AB1234), sin
// importar desde qué ventana/dispositivo se haya generado. La pantalla del QR
// del bus la consulta periódicamente (polling) para saber si tiene que mostrar un QR nuevo.
const obtenerOrdenActual = async (req, res) => {
    try {
        const { bus, codigo, mensaje } = await resolverBus(req.query && req.query.patente);
        if (!bus) {
            return res.status(codigo).json({ status: "error", mensaje });
        }

        const orden = await OrdenActual.findOne({ busId: bus._id });
 
        return res.status(200).json({ orden: orden || null });
 
    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al obtener la orden actual",
            error: error.message
        });
    }
};
 
module.exports = {
    verMiPOS,
    pasajeEscolar,
    pasajeAdulto,
    guardarPago,
    listarPagos,
    consultarEstadoPago,
    obtenerOrdenActual
};