const { Schema, model } = require("mongoose");

const BusSchema = Schema({
    id: {
        type: Number
    },
    name: {
        type: String
    },
    status: {
        type: String
    },
    date_created: {
        type: Date
    },
    date_last_updated: {
        type: Date
    },
    user_id: {
        type: Number
    },
    external_id: {
        type: String
    },
    qr_response: {
        uuid: {
            type: String
        },
        image: {
            type: String
        },
        template_document: {
            type: String
        },
        template_image: {
            type: String
        },
        qr_code: {
            type: String
        }
    },
    config: {
        qr: {
            operating_mode: {
                type: String
            }
        }
    }
});

module.exports = model("Bus", BusSchema, "buses");

// {
//   "id": 1234567,
//   "name": "POS-001",
//   "status": "active",
//   "date_created": "2024-01-15T10:30:00Z",
//   "date_last_updated": "2024-03-01T08:00:00Z",
//   "user_id": 123456,
//   "external_id": "SUC001POS001",
//   "qr_response": {
//     "uuid": "0977011a027c4b4387e52069da4264deae2946af4dcc44ee98a8f1dbb376c8a1",
//     "image": "https://www.mercadopago.com/instore/merchant/qr/1234567/abc123.png",
//     "template_document": "https://www.mercadopago.com/instore/merchant/qr/1234567/template_abc123.pdf",
//     "template_image": "https://www.mercadopago.com/instore/merchant/qr/1234567/template_abc123.png",
//     "qr_code": "00020101021226940014BR.GOV.BCB.PIX2572pix-qr-h.mercadopago.com/instore/h/p/v2/abc123"
//   },
//   "config": {
//     "qr": {
//       "operating_mode": "pdv"
//     }
//   }
// }
