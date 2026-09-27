const fetch = require("node-fetch");
const { randomUUID } = require('crypto');
const Pago = require("../modelos/Pago");
const OrdenActual = require("../modelos/OrdenActual");
 
// Como solo hay una pantalla de QR por POS, guardamos siempre un único
// documento con la última orden creada (upsert con filtro vacío) en vez de
// llevar un historial. La pantalla del QR lo consulta por polling.
const guardarOrdenActual = async ({ externalReference, qrData, titulo, monto }) => {
    await OrdenActual.findOneAndUpdate(
        {},
        { externalReference, qrData, titulo, monto, creadoEn: new Date() },
        { upsert: true, new: true }
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
 
const pasajeEscolar = async (req, res) => {
    try {
        const idempotencyKey = randomUUID();
 
        // Antes esto era un string fijo ("PE-001"): todos los pasajes escolares
        // compartían la misma referencia y no había forma de saber, mirando la
        // colección de pagos, a cuál QR (a cuál compra) correspondía un webhook.
        // Generamos una referencia única por cada orden creada.
        const externalReference = `PE-${randomUUID()}`;
 
        const respuesta = await fetch(`https://api.mercadopago.com/v1/orders`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": idempotencyKey
            },
            body: JSON.stringify({
 
                "type": "qr",
                "total_amount": "500",
                "description": "Pasaje escolar",
                "external_reference": externalReference,
                "expiration_time": "PT5M",
                "config": {
                    "qr": {
                        "external_pos_id": "TRC001POS001",
                        "mode": "dynamic"
                    }
                },
                "transactions": {
                    "payments": [
                        {
                            "amount": "500"
                        }
                    ]
                },
                "items": [{"title": "Pasaje Escolar",
                    "unit_price": "500",
                    "quantity": 1,
                    "unit_measure": "unit"
                }]
            })
        });
 
        const data = await respuesta.json();
 
        if (data && data.type_response && data.type_response.qr_data) {
            await guardarOrdenActual({
                externalReference: data.external_reference,
                qrData: data.type_response.qr_data,
                titulo: "Pasaje Escolar",
                monto: data.total_amount
            });
        }
 
        return res.status(200).json(data);
 
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mensaje: "Error al llamar la API de MP" });
    }
};
 
const pasajeAdulto = async (req, res) => {
    try {
        const idempotencyKey = randomUUID();
        const externalReference = `PA-${randomUUID()}`;
 
        const respuesta = await fetch(`https://api.mercadopago.com/v1/orders`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": idempotencyKey
            },
            body: JSON.stringify({
 
                "type": "qr",
                "total_amount": "1500",
                "description": "Pasaje adulto",
                "external_reference": externalReference,
                "expiration_time": "PT5M",
                "config": {
                    "qr": {
                        "external_pos_id": "TRC001POS001",
                        "mode": "dynamic"
                    }
                },
                "transactions": {
                    "payments": [
                        {
                            "amount": "1500"
                        }
                    ]
                },
 
                "items": [{
                    "title": "Pasaje Adulto",
                    "unit_price": "1500",
                    "quantity": 1,
                    "unit_measure": "unit"
                }]
            })
        });
 
        const data = await respuesta.json();
 
        if (data && data.type_response && data.type_response.qr_data) {
            await guardarOrdenActual({
                externalReference: data.external_reference,
                qrData: data.type_response.qr_data,
                titulo: "Pasaje Adulto",
                monto: data.total_amount
            });
        }
 
        return res.status(200).json(data);
 
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mensaje: "Error al llamar la API de MP" });
    }
};
 
guardarPago = async (req, res) => {
    try {
        let parametros = req.body;
        //validarCaduco(parametros);
 
        const pago = new Pago(parametros);
        const pagoGuardado = await pago.save();
 
        return res.status(200).json({
            status: "éxito",
            pago: pagoGuardado,
            mensaje: "Pago registrado con éxito!! GRAAAAAAAAAAAAAAAAAAAAAAAAAAH"
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
 
// Devuelve la última orden creada, sin importar quién ni desde qué
// ventana/dispositivo la haya generado. La pantalla del QR la consulta
// periódicamente (polling) para saber si tiene que mostrar un QR nuevo.
const obtenerOrdenActual = async (req, res) => {
    try {
        const orden = await OrdenActual.findOne();
 
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
