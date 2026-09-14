const fs = require("fs");
const path = require("path");
const { validarArticulo, validarIdArticulo } = require("../util/validar");
const Articulo = require("../modelos/Articulo");

const prueba = (req, res) => {

    return res.status(200).json({
        mensaje: "Soy una acción de prueba en mi controlador de artículos"
    });
}

const curso = (req, res) => {

    console.log("Se ha ejecutado el endpoint probando");

    return res.status(200).json([{
        curso: "Desarrollo Web y Móvil",
        autor: "Alvaro Sánchez",
        url: "alvarosanchez.com/desarrollo-web-movil"
    },
    {
        curso: "Portafolio de Proyectos",
        autor: "Alvaro Sánchez",
        url: "alvarosanchez.com/desarrollo-web-movil"
    },
    ]);

};

const crear = (req, res) => {

    // Obtener parametros por post a guardar
    let parametros = req.body;

    // Validar datos
    try {
        validarArticulo(parametros);

    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "Faltan datos por enviar"
        });
    }

    // Crear el objeto a guardar
    const articulo = new Articulo(parametros);

    // Asignar valores a objeto basado en el modelo (manual o automatico)
    //articulo.titulo = parametros.titulo;

    // Guardar el articulo en la base de datos
    articulo.save();

    // Devolver resultado
    return res.status(200).json({
        status: "éxito",
        articulo: parametros,
        mensaje: "Artículo creado con éxito!!"
    })

}

const listar = async (req, res) => {

    try {
        let consulta = Articulo.find({});

        if (req.params.ultimos) {
            consulta.limit(req.params.ultimos);
        }

        let resultado = await consulta.sort({ fecha: -1 });

        if (!resultado) {
            return res.status(404).json({
                status: "error",
                mensaje: "No se han encontrado artículos!!"
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
            mensaje: "No se encuentran artículos!!"
        });
    }
}

const listar_uno = async (req, res) => {
    // Recoger un id por la url
    let id = req.params.id;
    // Validar datos
    try {
        validarIdArticulo(id);

    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "Id con formato incorrecto"
        });
    }

    try {
        // Buscar el articulo
        let resultado = await Articulo.findById(id);
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
            mensaje: "No se han encontrado el artículo"
        });
    }
}

const borrar = async (req, res) => {
    // Recoger un id por la url

    try {
        let articuloId = req.params.id;
        validarIdArticulo(articuloId);
        let resultado = await Articulo.findOneAndDelete({ _id: articuloId });

        if (!resultado) {
            return res.status(500).json({
                status: "error",
                mensaje: "Error al borrar el artículo"
            });
        } else {
            return res.status(200).json({
                status: "éxito",
                articulo: resultado,
                mensaje: "Artículo borrado"
            });
        }
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "No se ha podido borrar el artículo, posiblemente el formato de ID es incorrecto!!"
        });
    }
}

const editar = async (req, res) => {
    // Recorger id articulo a editar
    let articuloId = req.params.id;

    // Recoger datos del body
    let parametros = req.body;

    // Validar datos
    try {
        validarArticulo(parametros);
        // Buscar y actualizar articulo
        let resultado = await Articulo.findOneAndUpdate({ _id: articuloId }, req.body, { new: true });

        if (!resultado) {
            return res.status(500).json({
                status: "error",
                mensaje: "Error al actualizar el artículo"
            });
        } else {
            return res.status(200).json({
                status: "éxito",
                articulo: resultado,
                mensaje: "Artículo actualizado!!"
            });
        }

    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "Faltan datos por enviar"
        });
    }

}

const subir = async (req, res) => {

    try {
        // Recoger el fichero de imagen subido
        if (!req.file && !req.files) {
            return res.status(404).json({
                status: "error",
                mensaje: "Petición invalida"
            });
        }

        // Nombre del archivo
        let archivo = req.file.originalname;

        // Extension del archivo
        let archivo_split = archivo.split("\."); //nombredearchivo.jpg

        let extension = archivo_split[1];
        // Comprobar extension correcta
        if (extension != "png" && extension != "jpg" &&
            extension != "jpeg" && extension != "gif") {

            // Borrar archivo y dar respuesta
            fs.unlink(req.file.path, (error) => {
                return res.status(400).json({
                    status: "error",
                    mensaje: "Imagen invalida"
                });
            })
        } else {

            // Recorger id articulo a editar
            let articuloId = req.params.id;

            // Buscar y actualizar articulo
            let resultado = await Articulo.findOneAndUpdate({ _id: articuloId }, { imagen: req.file.filename }, { new: true });

            if (!resultado) {
                return res.status(500).json({
                    status: "error",
                    mensaje: "Error al actualizar"
                });
            } else {
                // Devolver respuesta
                return res.status(200).json({
                    status: "éxito",
                    articulo: resultado,
                    fichero: req.file
                })
            }

        }
    } catch (error) {
        return res.status(400).json({
            status: "error",
            mensaje: "Error al actualizar!"
        });
    }

}

const imagen = (req, res) => {
    let fichero = req.params.fichero;
    let ruta_fisica = "./imagenes/articulos/" + fichero;

    fs.stat(ruta_fisica, (error, existe) => {
        if (existe) {
            return res.sendFile(path.resolve(ruta_fisica));
        } else {
            return res.status(404).json({
                status: "error",
                mensaje: "La imagen no existe",
                existe,
                fichero,
                ruta_fisica
            });
        }
    })
}

const buscador = async (req, res) => {
    // Sacar el string de busqueda
    let busqueda = req.params.busqueda;

    // Find OR 
    let consulta = Articulo.find({
        "$or": [
            { "titulo": { "$regex": busqueda, "$options": "i" } },
            { "contenido": { "$regex": busqueda, "$options": "i" } },
        ]
    });

    let resultado = await consulta.sort({ fecha: -1 });


    if (!resultado || resultado.length <= 0) {
        return res.status(404).json({
            status: "error",
            mensaje: "No se han encontrado artículos"
        });
    }
    else {

        return res.status(200).json({
            status: "éxito",
            articulos: resultado
        });
    }

}

module.exports = {
    prueba,
    curso,
    crear,
    listar,
    listar_uno,
    borrar,
    editar,
    subir,
    imagen,
    buscador
}
