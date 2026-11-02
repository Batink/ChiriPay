const validator = require("validator");

// ---------------------------------------------------------------------------
// BUSES
// ---------------------------------------------------------------------------

// Valida (y limpia) los datos de un bus. Devuelve un objeto con los valores ya
// normalizados, o lanza un Error con el detalle de lo que está mal.
//
//  - patente:     6 caracteres alfanuméricos. Se quitan espacios y guiones y se
//                 pasa a mayúsculas ("fl-xt-12" -> "FLXT12"). Si necesitas otro
//                 formato, cambia solo la expresión regular de abajo.
//  - nombre:      es el "name" del POS en Mercado Pago: letras, números, guiones,
//                 guiones bajos y espacios internos. Máximo 45 caracteres.
//  - external_id: es el "external_id" del POS en Mercado Pago: solo letras y
//                 números. Máximo 40 caracteres.
//
//  - activo:      solo al editar (parcial): true reactiva un bus dado de baja y
//                 false lo da de baja. Acepta booleano o "true"/"false".
//
// Con { parcial: true } (para editar) solo se validan los campos que vengan en
// el body, pero tiene que venir al menos uno. El chofer del bus NO se valida
// aquí a propósito: se asigna con sus propios endpoints (Fase 3).

const validarBus = (parametros = {}, { parcial = false } = {}) => {

    const errores = [];
    const limpio = {};

    // Acepta string o número (por si el JSON trae el external_id como número)
    const texto = (valor) =>
        (typeof valor === "string" || typeof valor === "number") ? String(valor) : "";

    if (!parcial || parametros.patente !== undefined) {
        const patente = texto(parametros.patente).replace(/[\s-]/g, "").toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(patente)) {
            errores.push("La patente debe tener 6 caracteres alfanuméricos (ej: FLXT12)");
        } else {
            limpio.patente = patente;
        }
    }

    if (!parcial || parametros.nombre !== undefined) {
        const nombre = texto(parametros.nombre);
        if (!validator.isLength(nombre, { min: 1, max: 45 }) ||
            !/^[A-Za-z0-9_-]+(?: +[A-Za-z0-9_-]+)*$/.test(nombre)) {
            errores.push("El nombre debe tener entre 1 y 45 caracteres: letras, números, guiones, guiones bajos y espacios internos");
        } else {
            limpio.nombre = nombre;
        }
    }

    if (!parcial || parametros.external_id !== undefined) {
        const external_id = texto(parametros.external_id);
        if (!validator.isLength(external_id, { min: 1, max: 40 }) ||
            !/^[A-Za-z0-9]+$/.test(external_id)) {
            errores.push("El external_id debe tener entre 1 y 40 caracteres, solo letras y números (ej: TRC001POS001)");
        } else {
            limpio.external_id = external_id;
        }
    }

    if (parcial && parametros.activo !== undefined) {
        const activo = parametros.activo === true || parametros.activo === "true" ? true
            : parametros.activo === false || parametros.activo === "false" ? false
            : null;
        if (activo === null) {
            errores.push("activo debe ser true o false");
        } else {
            limpio.activo = activo;
        }
    }

    if (parcial && errores.length === 0 && Object.keys(limpio).length === 0) {
        errores.push("No se envió ningún campo para actualizar (patente, nombre, external_id o activo)");
    }

    if (errores.length > 0) {
        throw new Error(errores.join(". "));
    }

    return limpio;
}

const validarIdBus = (id) => {
    if (!validator.isMongoId(String(id))) {
        throw new Error("El ID del bus tiene un formato incorrecto");
    }
}

module.exports = {
    validarBus,
    validarIdBus
}