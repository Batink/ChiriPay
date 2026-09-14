// Es como realizar un import, aquí añadimos o incorporamos el ORM mongoose
// al archivo conexion.js
const mongoose = require("mongoose");

const conexion = async() => {

    try {

        await mongoose.connect("mongodb://127.0.0.1:27017/TestMPChiripay");

        // Parametros dentro de objeto // solo en caso de aviso
        // useNewUrlParser: true
        // useUnifiedTopology: true
        // useCreateIndex: true

        console.log("Conectado correctamente a la base de datos TestMPChiripay !!");

    } catch(error) {
        console.log(error);
        console.log("No se ha podido conectar a la base de datos !!");
    }

}

module.exports = {
    conexion
}
