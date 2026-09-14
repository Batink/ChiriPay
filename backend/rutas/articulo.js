const express = require("express");
const multer = require("multer");

const ArticuloControlador = require("../controladores/articulo");
const UsuarioControlador = require("../controladores/usuario");

const router = express.Router();

const almacenamiento = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, './imagenes/articulos/');
    },

    filename: function(req, file, cb){
        cb(null, "articulo" + Date.now() + file.originalname);
    }
})

const subidas = multer({storage: almacenamiento});

// Rutas de pruebas
router.get("/ruta-de-prueba", ArticuloControlador.prueba);
router.get("/curso", ArticuloControlador.curso);

//rutas para gestión de la collección articulos de la base de datos mi_blog
router.post("/crear", ArticuloControlador.crear);
router.get("/articulos", ArticuloControlador.listar);
router.get("/articulos/:ultimos", ArticuloControlador.listar);
router.get("/articulo/:id", ArticuloControlador.listar_uno);
router.delete("/articulo/:id", ArticuloControlador.borrar);
router.put("/articulo/:id", ArticuloControlador.editar);
router.post("/subir-imagen/:id", subidas.single("file0"), ArticuloControlador.subir);
router.get("/imagen/:fichero", ArticuloControlador.imagen);
router.get("/buscar/:busqueda", ArticuloControlador.buscador);

//rutas para gestión de la collección usuario de la base de datos mi_blog
router.post("/crearUsuario", UsuarioControlador.crear_usuario);
router.get("/listarUsuarios", UsuarioControlador.listar_usuario);
router.get("/listarUsuario/:nombre", UsuarioControlador.listar_un_usuario);
router.post("/borrarUsuario/:id", UsuarioControlador.borrar_usuario);
router.post("/editarUsuario/:id", UsuarioControlador.editar_usuario);

module.exports = router;


