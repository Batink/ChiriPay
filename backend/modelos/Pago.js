const { Schema, model } = require("mongoose");

const PagoSchema = Schema({
    action: {
    type: String
    },
    api_version: {
        type: String
    },
    application_id: {
        type: String
    },
    date_created: {
        type: Date
    },
    live_mode: {
        type: Boolean
    },
    type: {
        type: String
    },
    user_id: {
        type: Number
    },
    data: {
        external_reference: {
            type: String
        },
        id: {
            type: String
        },
        status: {
            type: String
        },
        status_detail: {
            type: String
        },
        total_paid_amount: {
            type: Number
        },
        type: {
            type: String
        },
        version: {
            type: Number
        },
        transactions: {
            payments: [
                {
                    amount: {
                        type: Number
                    },
                    id: {
                        type: String
                    },
                    paid_amount: {
                        type: Number
                    },
                    status: {
                        type: String
                    },
                    status_detail: {
                        type: String
                    },
                    payment_method: {
                        id: {
                            type: String
                        },
                        installments: {
                            type: Number
                        },
                        type: {
                            type: String
                        }
                    },
                    reference: {
                        id: {
                            type: Number
                        }
                    }
                }
            ]
        }
    }
});

module.exports = model("Pago", PagoSchema, "pagos");

// {
//   "action": "order.processed",
//   "api_version": "v1",
//   "application_id": "7526912278434426",
//   "data": {
//     "external_reference": "ext_ref_1234",
//     "id": "123456",
//     "status": "processed",
//     "status_detail": "accredited",
//     "total_paid_amount": 100000,
//     "transactions": {
//       "payments": [
//         {
//           "amount": 100000,
//           "id": "PAY01K7S9596QBWZRTY02NF",
//           "paid_amount": 100000,
//           "payment_method": {
//             "id": "visa",
//             "installments": 1,
//             "type": "credit_card"
//           },
//           "reference": {
//             "id": 1234567891
//           },
//           "status": "processed",
//           "status_detail": "accredited"
//         }
//       ]
//     },
//     "type": "point",
//     "version": 3
//   },
//   "date_created": "2021-11-01T02:02:02-04:00",
//   "live_mode": true,
//   "type": "order",
//   "user_id": 3379171752
// }