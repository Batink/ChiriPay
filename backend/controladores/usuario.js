const fs = require("fs");
const path = require("path");
const { validarNombreUsuario, validarUsuario, validarIdUsuario } = require("../util/validar");
const Usuario = require("../modelos/Usuario");


const crear_usuario = (req, res) => {

    // Obtener parametros por post a guardar
    let parametros = req.body;
    // Validar datos
    try {
        validarUsuario(parametros);

    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "Faltan datos por enviar"
        });
    }

    // Crear el objeto a guardar
    const usuario = new Usuario(parametros);

    // Asignar valores a objeto basado en el modelo (manual o automatico)
    //articulo.titulo = parametros.titulo;

    // Guardar el articulo en la base de datos
    usuario.save();

    // Devolver resultado
    return res.status(200).json({
        status: "éxito",
        usuario: parametros,
        mensaje: "Usuario creado con éxito!!"
    })

}

const listar_usuario = async (req, res) => {

    try {
        let consulta = Usuario.find({});

        if (req.params.ultimos) {
            consulta.limit(req.params.ultimos);
        }

        let resultado = await consulta.sort({ fecha: -1 });

        if (!resultado) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se han encontrado usuarios!!"
            });
        } else {
            return res.status(200).send({
                status: "éxito",
                contador: resultado.length,
                resultado
            });
        }
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "No se encuentran usuarios!!"
        });
    }
}

const listar_un_usuario = async (req, res) => {
    // Recoger un nombre de usuario por la url
    let nombreU = req.params.nombre;
    
    // Validar datos
    try {
        validarNombreUsuario(nombreU);

    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "Nombre de usuario incorrecto"
        });
    }

    try {
        // Buscar el usuario
        console.log(nombreU);
        let resultado = await Usuario.find({nombre: nombreU});
        if (!resultado) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se han encontrado el artículo"
            });
        } else {
            return res.status(200).json({
                status: "éxito",
                resultado
            });
        }
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "No se ha encontrado el usuario"
        });
    }
}

const borrar_usuario = async (req, res) => {
    // Recoger un id por la url
    let usuarioRut = req.params.id;
    try {

        let resultado = await Usuario.findOneAndDelete({ rut: usuarioRut });

        if (!resultado) {
            return res.status(500).json({
                status: "error",
                mensaje: "Error al borrar el usuario"
            });
        } else {
            return res.status(200).json({
                status: "éxito",
                usuario: resultado,
                mensaje: "Usuario borrado"
            });
        }
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "No se ha podido borrar el usuario!!"
        });
    }
}

const editar_usuario = async (req, res) => {
    // Recorger id usuario a editar
    let usuarioRut = req.params.id;

    try {
    
        // Buscar y actualizar usuario
        let resultado = await Usuario.findOneAndUpdate({ rut: usuarioRut }, req.body, { new: true });

        if (!resultado) {
            return res.status(500).json({
                status: "error",
                mensaje: "Error al actualizar el usuario"
            });
        } else {
            return res.status(200).json({
                status: "éxito",
                usuario: resultado,
                mensaje: "Usuario actualizado!!"
            });
        }

    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "Faltan datos por enviar"
        });
    }

}


module.exports = {
    crear_usuario,
    listar_usuario,
    listar_un_usuario,
    borrar_usuario,
    editar_usuario
}
