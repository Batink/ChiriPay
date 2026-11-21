const Pago = require("../modelos/Pago");
const { validarFiltrosBoletos } = require("../util/validar");

// GET /boletos : los boletos que muestra el dashboard (un boleto = una orden cobrada).
//
// A diferencia de GET /pagos (el espejo crudo del webhook: una fila por cada
// notificación de Mercado Pago, la usa la tabla pública), aquí se entrega UNA
// fila por orden, con su último estado, y solo las cobradas ("processed").
//
// Filtros opcionales por query: desde, hasta (inclusive), busId y choferId.
// Los pagos anteriores a que el backend guardara el bus y el chofer en cada
// venta salen SIN ATRIBUIR: busId y choferId en null, y todo el monto para la
// empresa (no se sabe a qué chofer corresponde, así que no se le reparte nada).

// Solo se leen los campos que hacen falta
const CAMPOS = "date_created busId choferId monto_chofer monto_empresa data.id data.status data.external_reference data.total_paid_amount data.transactions.payments";

// Fecha del pago: date_created del webhook; si falta, la fecha embebida en el _id de Mongo.
const fechaDe = (pago) => {
    const ms = pago.date_created ? new Date(pago.date_created).getTime() : NaN;
    return Number.isNaN(ms) ? parseInt(String(pago._id).slice(0, 8), 16) * 1000 : ms;
};

const listar = async (req, res) => {

    let filtros;
    try {
        filtros = validarFiltrosBoletos(req.query || {});
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: error.message
        });
    }

    try {
        // Bus y chofer se filtran en la base: todos los webhooks de una orden
        // llevan el mismo bus y chofer, así que no cambia cuál es el último.
        // La fecha NO: se aplica después de quedarnos con el último estado de
        // cada orden (una orden cobrada y reembolsada después no es un boleto).
        const filtro = {};
        if (filtros.busId) filtro.busId = filtros.busId;
        if (filtros.choferId) filtro.choferId = filtros.choferId;

        const pagos = await Pago.find(filtro, CAMPOS).lean();

        // Mercado Pago manda un webhook por cada cambio de estado de la orden:
        // nos quedamos con el más reciente de cada una.
        const ultimos = new Map();
        for (const pago of pagos) {
            const ordenId = pago.data && pago.data.id;
            if (!ordenId) continue;

            const previo = ultimos.get(ordenId);
            const ms = fechaDe(pago);
            const msPrevio = previo ? fechaDe(previo) : -Infinity;
            // En un empate gana el que se guardó después
            if (!previo || ms > msPrevio || (ms === msPrevio && String(pago._id) > String(previo._id))) {
                ultimos.set(ordenId, pago);
            }
        }

        const resultado = [...ultimos.values()]
            .filter((pago) => pago.data.status === "processed") // solo pagos cobrados
            .map((pago) => {
                const transaccion = pago.data.transactions && pago.data.transactions.payments && pago.data.transactions.payments[0];
                const monto = Number(
                    pago.data.total_paid_amount ?? (transaccion && (transaccion.paid_amount ?? transaccion.amount)) ?? 0
                );

                const atribuido = pago.busId != null;
                const montoChofer = atribuido ? (pago.monto_chofer ?? 0) : 0;

                return {
                    id: pago.data.id,
                    ms: fechaDe(pago),
                    busId: atribuido ? String(pago.busId) : null,
                    choferId: atribuido && pago.choferId != null ? String(pago.choferId) : null,
                    referencia: pago.data.external_reference ?? "",
                    monto,
                    monto_chofer: montoChofer,
                    monto_empresa: atribuido ? (pago.monto_empresa ?? monto - montoChofer) : monto
                };
            })
            .filter((boleto) =>
                (filtros.desde === undefined || boleto.ms >= filtros.desde) &&
                (filtros.hasta === undefined || boleto.ms <= filtros.hasta)
            )
            .sort((a, b) => a.ms - b.ms || String(a.id).localeCompare(String(b.id)))
            .map(({ ms, ...boleto }) => ({ ...boleto, fecha: new Date(ms).toISOString() }));

        return res.status(200).json({
            status: "éxito",
            contador: resultado.length,
            resultado
        });

    } catch (error) {
        return res.status(500).json({
            status: "error",
            mensaje: "Error al listar los boletos",
            error: error.message
        });
    }
}

module.exports = {
    listar
}