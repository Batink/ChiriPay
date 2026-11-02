reqEx = { // Datos de prueba para la solicitud de pasaje escolar
    amount: 500,
    title: "Pasaje Escolar",
    external_pos_id: "TRC001POS001",
    code: "PE"
}



const pasajeAdulto = async (req, res) => {

    req.body = req.body || {};


    try {
        const idempotencyKey = randomUUID();
        const externalReference = `${req.body.code}-${randomUUID()}`;
 
        const respuesta = await fetch(`https://api.mercadopago.com/v1/orders`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": idempotencyKey
            },
            body: JSON.stringify({
 
                "type": "qr",
                "total_amount": req.body.amount,
                "description": req.body.title,
                "external_reference": externalReference,
                "expiration_time": "PT2M",
                "config": {
                    "qr": {
                        "external_pos_id": req.body.external_pos_id,
                        "mode": "dynamic"
                    }
                },
                "transactions": {
                    "payments": [
                        {
                            "amount": req.body.amount
                        }
                    ]
                },
 
                "items": [{
                    "title": req.body.title,
                    "unit_price": req.body.amount,
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
                titulo: req.body.title,
                monto: data.total_amount
            });
        }
 
        return res.status(200).json(data);
 
    } catch (error) {
        console.log(error);
        return res.status(500).json({ mensaje: "Error al llamar la API de MP" });
    }
};