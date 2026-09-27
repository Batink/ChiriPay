// dotenv tiene que cargarse ANTES que cualquier otro require que use
// process.env (conexion.js, controladores/pago.js, etc.), por eso va primero
// que todo lo demás en el archivo.
require("dotenv").config();
// Es como realizar un import, aquí añadimos o incorporamos el archivo
// de la conexión creada a la base de datos.
// También importamos el modulo del servidor express y el cors para llamadas
// http de origenes cruzados o diferentes.
const { conexion } = require("./basedatos/conexion");
const express = require("express");
const cors = require("cors");




//access_token = APP_USR-1492590052637591-050615-b26ff2d9d1b16ed2400aaf26152ab077-3382402657




// Inicializar app
console.log("App de node arrancada");

// Conectar a la base de datos
conexion();

// Crear servidor Node
const app = express();
const puerto = process.env.PORT || 3600;

// Configurar cors
app.use(cors());

// Convertir body a objeto js
app.use(express.json()); // recibir datos con content-type app/json
app.use(express.urlencoded({extended:true})); // form-urlencoded


// Rutas prueba con datos en duro
app.get("/probando", (req, res) => {

    console.log("Se ha ejecutado el endpoint probando");

    return res.status(200).json([{
        curso: "Desarrollo Web y Móvil",
        autor: "Alvaro Sanchez",
        url: "alvarosanchez73.com/react-node-express"
    },
    {
        curso: "Portafolio de Proyectos",
        autor: "Alvaro Sanchez",
        url: "alvarosanchez73.com/portafolio"
    },
    ]);

});

app.get("/", (req, res) => {


    return res.status(200).send(
        "<h1>Empezando a crear un api rest con node</h1>"
    );

});


app.post('/webhook', async (req, res) => {
    console.log("=== WEBHOOK RECIBIDO ===");

    try {
        const respuesta = await fetch("http://localhost:3600/api/guardar-pago", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"  // 👈 esto faltaba
            },
            body: JSON.stringify(req.body)
        });
        const data = await respuesta.json();
        console.log("Respuesta:", data);
    } catch (error) {
        console.error("Error al guardar pago:", error.message);
    }

    res.sendStatus(200);  // siempre responde 200 a MercadoPago
});

const rutas_pago = require("./rutas/pago");
app.use("/api", rutas_pago);


// Crear servidor y escuchar peticiones http
app.listen(puerto, () => {
    console.log("Servidor corriendo en el puerto " + puerto);
});





