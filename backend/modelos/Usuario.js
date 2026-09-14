// Es como realizar un import, aquí añadimos o incorporamos la dependencia
// de mongoose al archivo o modelo implementado.
const { Schema, model } = require("mongoose");

const UsuarioSchema = Schema({
	rut: {
        type: String,
        required: true
    },
    nombres: {
        type: String,
        required: true
    },
    apellido_paterno: {
        type: String,
        required: true
    },
    apellido_materno: {
        type: String,
        required: true
    },
    nombre_usuario: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

module.exports = model("Usuario", UsuarioSchema, "usuario");
