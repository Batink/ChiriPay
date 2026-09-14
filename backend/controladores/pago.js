const fetch = require("node-fetch");
const { randomUUID } = require('crypto');
const Pago = require("../modelos/Pago");





const ACCESS_TOKEN = "APP_USR-1492590052637591-050615-b26ff2d9d1b16ed2400aaf26152ab077-3382402657";
const POS_ID = "131648234";
//Punto env para llamar al token y no tener el token en el código.

const listarPagos = async (req, res) => {
    try {
        const pagos = await Pago.find();
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
                "external_reference": "PE-001",
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

        return res.status(200).json(data);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ mensaje: "Error al llamar la API de MP" });
    }
};

const pasajeAdulto = async (req, res) => {
    try {
        const idempotencyKey = randomUUID();

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
                "external_reference": "PA-001",
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


module.exports = { verMiPOS, pasajeEscolar, pasajeAdulto, guardarPago, listarPagos };


// {
//     "id": "ORDTST01KR71ACDBWDWZE4E2A1RBSMK9",
//     "type": "qr",
//     "processing_mode": "automatic",
//     "external_reference": "PE-001",
//     "description": "Pasaje escolar",
//     "total_amount": "500",
//     "expiration_time": "PT5M",
//     "country_code": "CHL",
//     "user_id": "3382402657",
//     "status": "created",
//     "status_detail": "created",
//     "currency": "CLP",
//     "created_date": "2026-05-09T18:52:11.24Z",
//     "last_updated_date": "2026-05-09T18:52:11.24Z",
//     "integration_data": {
//         "application_id": "1492590052637591"
//     },
//     "config": {
//         "qr": {
//             "external_pos_id": "TRC001POS001",
//             "mode": "dynamic"
//         }
//     },
//     "transactions": {
//         "payments": [
//             {
//                 "id": "PAY01KR71ACE87X6PTSA9XW4XZJFK",
//                 "amount": "500",
//                 "status": "created",
//                 "status_detail": "ready_to_process"
//             }
//         ]
//     },
//     "items": [
//         {
//             "title": "Pasaje Escolar",
//             "unit_price": "500",
//             "unit_measure": "unit",
//             "quantity": 1
//         }
//     ],
//     "taxes": [
//         {
//             "payer_condition": "payment_taxable_iva"
//         }
//     ],
//     "type_response": {
//         "qr_data": "00020101021243650016COM.MERCADOLIBRE02013063605a3a452-61fe-4be2-b5fe-ff21a63fc5b4501300091111111115204970053031525802CL5909Test Test6009UNDEFINED63042C66"
//     }
// }


// Conectar id webhook -> id creacion OP para mostrar el tipo de pasaje
// ID de caja por patente de bus???
// Actualizar status del pago y mostrar solo cuando este en procesado