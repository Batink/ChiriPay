import React from 'react'
import { useState, useEffect } from 'react';


const INTERVALO_REFRESCO_MS = 5000;


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
            // alert("Error al conectar con la API de prueba.");
        }
    };


    useEffect(() => {
        conseguirDatos();
        const intervalo = setInterval(conseguirDatos, INTERVALO_REFRESCO_MS);
        return () => clearInterval(intervalo);
    }, []); //Array vacío = se ejecuta solo una vez

    const crearTabla = (col = 1) => {
        
        let filas = pasajes.length; //si quiero limitarlo dejarlo como int
        // console.log(pasajes);

        return (

            <tbody>
                

                {Array.from({ length: filas }).map((_, filaIndex) => {

                    if (!pasajes[filaIndex]) {
                        return (
                            <tr key={filaIndex}>
                                <td colSpan="4">Cargando...</td>
                            </tr>
                        );
                    }

                    const pasaje = pasajes[filaIndex]; // Para evitar repetir pasajes[filaIndex]

                    
                    return (
                        <tr key={filaIndex}>
                            <td>{pasaje.date_created.slice(0, 10)}</td>
                            <td>{pasaje.date_created.slice(11, 19)}</td>
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
                            <th> Día </th>
                            <th> Hora </th>
                            <th> ID </th>
                            <th> Status </th>
                            <th> Monto </th>
                        </tr>
                    </thead>

                    
                        {crearTabla(3)}

                    
                </table>
            </center>
        </div>
    )
}
