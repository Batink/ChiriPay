const Reparto = require("../modelos/Reparto");

// Porcentaje del chofer mientras nadie haya guardado uno (es el mismo valor
// inicial que muestra el panel de administración).
const PORCENTAJE_POR_DEFECTO = 20;

const porcentajeVigente = async () => {
    const configuracion = await Reparto.findOne();
    return configuracion ? configuracion.porcentajeChofer : PORCENTAJE_POR_DEFECTO;
};

// Divide un monto (en pesos enteros) entre chofer y empresa. Se redondea la
// parte del chofer y la empresa se queda con el resto, así siempre suman el total.
const calcularReparto = (monto, porcentaje) => {
    const monto_chofer = Math.round((monto * porcentaje) / 100);
    return { monto_chofer, monto_empresa: monto - monto_chofer };
};

module.exports = {
    PORCENTAJE_POR_DEFECTO,
    porcentajeVigente,
    calcularReparto
};