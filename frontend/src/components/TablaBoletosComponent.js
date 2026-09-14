import React from 'react'
import { useState, useEffect } from 'react';


export const TablaBoletosComponent = () => {

    const [pasajes, setPasajes] = useState([]);

    const conseguirDatos = async () => {
        try {
            const respuesta = await fetch(`http://localhost:3600/api/pagos`);
            const data = await respuesta.json();
            setPasajes(data.pagos);
            console.log(pasajes);
        } catch (error) {
            console.error("Hubo un error al llamar la API de prueba:", error);
            alert("Error al conectar con la API de prueba.");
        }
    };


    useEffect(() => {
        conseguirDatos();
    }, []); //Array vacío = se ejecuta solo una vez

    const crearTabla = (col = 1) => {
        
        let filas = pasajes.length;

        return (

            <tbody>
                

                {Array.from({ length: filas }).map((_, filaIndex) => {

                    // console.log(drogas)

                    if (!pasajes[filaIndex]) {
                        return (
                            <tr key={filaIndex}>
                                <td colSpan="3">Cargando...</td>
                            </tr>
                        );
                    }

                    const pasaje = pasajes[filaIndex]; // Para evitar repetir pasajes[filaIndex]

                    
                    return (
                        <tr key={filaIndex}>
                            <td >{pasaje.data.id}</td>
                            <td >{pasaje.data.status}</td>
                            <td >{pasaje.data.total_paid_amount}</td>
                        </tr>
                    );

                })}

            </tbody>


        );
    };

    return (
        <div>TablaBoletosComponent
            
            <center>
                <table border="1">
                    <thead className="oscbg">
                        <tr> 
                            <th> ID </th>
                            <th> Status </th>
                            <th> Total Paid </th>
                        </tr>
                    </thead>

                    
                        {crearTabla(3)}

                    
                </table>
            </center>
        </div>
    )
}
