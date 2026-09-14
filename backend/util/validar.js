const validator = require("validator");

const validarArticulo = (parametros) => {

    let validar_titulo = !validator.isEmpty(parametros.titulo) &&
        validator.isLength(parametros.titulo, { min: 5, max: undefined });
    let validar_contenido = !validator.isEmpty(parametros.contenido);

    if (!validar_titulo || !validar_contenido) {
        throw new Error("No se ha validado la información !!");
    }
}

const validarIdArticulo = (id) => {
    let validar_id = !validator.isEmpty(id) &&
        validator.isLength(id, { min: 24, max: 24 });

    if (!validar_id) {
        throw new Error("No se ha validado el ID!!");
    }
}

const validarUsuario = (parametros) => {

    let validar_nombre = !validator.isEmpty(parametros.nombre_usuario) &&
        validator.isLength(parametros.nombre_usuario, { min: 5, max: undefined });
    let validar_password = !validator.isEmpty(parametros.password) && 
     validator.isLength(parametros.password, { min: 6, max: 12 });

    if (!validar_nombre || !validar_password) {
        throw new Error("No se ha validado la información del usuario!!");
    }
}

const validarNombreUsuario = (nombre) => {
    let validar_nombre = !validator.isEmpty(nombre) &&
        validator.isLength(nombre, { min: 5, max: undefined });

    if (!validar_nombre) {
        throw new Error("No se ha validado el nombre!");
    }
}

const validarIdUsuario = (id) => {
    let validar_id = !validator.isEmpty(id) &&
        validator.isLength(id, { min: 24, max: 24 });

    if (!validar_id) {
        throw new Error("No se ha validado el ID!!");
    }
}

module.exports = {
    validarArticulo,
    validarIdArticulo,
    validarUsuario,
    validarNombreUsuario,
    validarIdUsuario
}
