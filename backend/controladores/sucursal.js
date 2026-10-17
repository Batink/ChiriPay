

USER_ID = process.env.MP_USER_ID;

const listarSuc = async (req, res) => {
    //const idempotencyKey = randomUUID();

    try {
        const respuesta = await fetch(`https://api.mercadopago.com/users/${USER_ID}/stores/search`, {
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

