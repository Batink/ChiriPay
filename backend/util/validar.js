const validator = require("validator");

// Acepta booleano o "true"/"false" (por si llega como form-urlencoded).
// Devuelve null si el valor no es ninguno de los dos.
const aBooleano = (valor) => {
    if (valor === true || valor === "true") return true;
    if (valor === false || valor === "false") return false;
    return null;
};

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
        const activo = aBooleano(parametros.activo);
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

// ---------------------------------------------------------------------------
// CHOFERES
// ---------------------------------------------------------------------------

// Dígito verificador de un RUT chileno (módulo 11). Recibe solo el cuerpo numérico.
const digitoVerificadorRut = (cuerpo) => {
    let suma = 0;
    let factor = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += Number(cuerpo[i]) * factor;
        factor = factor === 7 ? 2 : factor + 1;
    }
    const resto = 11 - (suma % 11);
    if (resto === 11) return "0";
    if (resto === 10) return "K";
    return String(resto);
};

// Acepta "12.345.678-5", "12345678-5", "123456785" o "1000005-k" y devuelve el
// RUT normalizado ("12345678-5"), o null si el formato o el dígito verificador
// no calzan. Es el formato en que se guarda y por el que se detectan duplicados.
const normalizarRut = (valor) => {
    const limpio = String(valor).replace(/[.\s-]/g, "").toUpperCase();
    if (!/^\d{7,10}[\dK]$/.test(limpio)) return null;

    const cuerpo = limpio.slice(0, -1).replace(/^0+/, "");
    const dv = limpio.slice(-1);
    if (!/^\d{7,8}$/.test(cuerpo) || digitoVerificadorRut(cuerpo) !== dv) return null;

    return `${cuerpo}-${dv}`;
};

// Valida (y limpia) los datos de un chofer. Devuelve un objeto con los valores
// ya normalizados, o lanza un Error con el detalle de lo que está mal.
// Al registrarlo son obligatorios nombre, rut, correo y cuenta.
//
//  - nombre: 2 a 80 caracteres: letras (con tildes), espacios, apóstrofes, puntos y guiones.
//  - rut:    RUT chileno con dígito verificador válido. Se guarda como "12345678-5".
//  - correo: correo válido, se guarda en minúsculas.
//  - cuenta: ID de la cuenta de Mercado Pago del chofer (para transferirle su parte).
//            Solo dígitos, de 5 a 20. Si tus cuentas usan otro formato, cambia solo
//            la expresión regular de abajo.
//
//  - activo: solo al editar (parcial). Es la disponibilidad (Activo / Inactivo).
//  - baja:   solo al editar (parcial) y solo con false: reactiva a un chofer dado
//            de baja. Para dar de baja se usa DELETE, que además lo desvincula de
//            sus buses; por eso aquí no se acepta true.
//
// Con { parcial: true } (para editar) solo se validan los campos que vengan en
// el body, pero tiene que venir al menos uno.

const validarChofer = (parametros = {}, { parcial = false } = {}) => {

    const errores = [];
    const limpio = {};

    // Acepta string o número (la cuenta de MP puede venir como número en el JSON)
    const texto = (valor) =>
        (typeof valor === "string" || typeof valor === "number") ? String(valor) : "";

    if (!parcial || parametros.nombre !== undefined) {
        const nombre = texto(parametros.nombre).trim().replace(/\s+/g, " ");
        if (!validator.isLength(nombre, { min: 2, max: 80 }) ||
            !/^[\p{L}\p{M}][\p{L}\p{M} '.-]*$/u.test(nombre)) {
            errores.push("El nombre debe tener entre 2 y 80 caracteres: letras, espacios, apóstrofes, puntos y guiones");
        } else {
            limpio.nombre = nombre;
        }
    }

    if (!parcial || parametros.rut !== undefined) {
        const rut = normalizarRut(texto(parametros.rut));
        if (!rut) {
            errores.push("El RUT no es válido (ej: 12.345.678-5): revisa el número y el dígito verificador");
        } else {
            limpio.rut = rut;
        }
    }

    if (!parcial || parametros.correo !== undefined) {
        const correo = texto(parametros.correo).trim().toLowerCase();
        if (!validator.isLength(correo, { max: 254 }) || !validator.isEmail(correo)) {
            errores.push("El correo no es válido");
        } else {
            limpio.correo = correo;
        }
    }

    if (!parcial || parametros.cuenta !== undefined) {
        const cuenta = texto(parametros.cuenta).trim();
        if (!/^\d{5,20}$/.test(cuenta)) {
            errores.push("La cuenta de Mercado Pago debe tener entre 5 y 20 dígitos");
        } else {
            limpio.cuenta = cuenta;
        }
    }

    if (parcial && parametros.activo !== undefined) {
        const activo = aBooleano(parametros.activo);
        if (activo === null) {
            errores.push("activo debe ser true o false");
        } else {
            limpio.activo = activo;
        }
    }

    if (parcial && parametros.baja !== undefined) {
        if (aBooleano(parametros.baja) !== false) {
            errores.push("Para dar de baja a un chofer usa DELETE /choferes/:id (baja solo acepta false, para reactivarlo)");
        } else {
            limpio.baja = false;
        }
    }

    if (parcial && errores.length === 0 && Object.keys(limpio).length === 0) {
        errores.push("No se envió ningún campo para actualizar (nombre, rut, correo, cuenta, activo o baja)");
    }

    if (errores.length > 0) {
        throw new Error(errores.join(". "));
    }

    return limpio;
}

const validarIdChofer = (id) => {
    if (!validator.isMongoId(String(id))) {
        throw new Error("El ID del chofer tiene un formato incorrecto");
    }
}

// Cuerpo de PUT /buses/:id/chofer: solo el chofer a asignar.
const validarAsignacion = (parametros = {}) => {
    const choferId = String(parametros.choferId ?? "");
    if (!validator.isMongoId(choferId)) {
        throw new Error("choferId es obligatorio y debe ser el ID de un chofer");
    }
    return { choferId };
}

module.exports = {
    validarBus,
    validarIdBus,
    validarAsignacion,
    validarChofer,
    validarIdChofer,
    normalizarRut
}