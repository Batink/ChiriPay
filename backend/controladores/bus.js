const fetch = require("node-fetch");
const { randomUUID } = require('crypto');
const Pago = require("../modelos/Pago");

//CRUD
//CREAR
//LEER
//ACTUALIZAR
//ELIMINAR
 
// SUCURSAL = LINEA DE BUSES / TERMINAL
// POS = BUS


const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const POS_ID = process.env.MP_POS_ID;
 
if (!ACCESS_TOKEN) {
    console.warn("⚠️  Falta MP_ACCESS_TOKEN en el .env: las llamadas a Mercado Pago van a fallar.");
}

// const crearPos = async (req, res) => {

const listarPOS = async (req, res) => {
    //const idempotencyKey = randomUUID();

    try {
        const respuesta = await fetch(`https://api.mercadopago.com/v2/pos`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json",
                // "X-Idempotency-Key": idempotencyKey
            }
        });

        const data = await respuesta.json();

        return res.status(200).json(data);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ mensaje: "Error al llamar la API de MP" });
    }
};



module.exports = {
    listarPOS
};