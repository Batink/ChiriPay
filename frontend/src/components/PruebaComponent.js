import React from 'react';
import { useState, useRef } from 'react';
import QRCode from 'react-qr-code';

import { TablaBoletosComponent } from './TablaBoletosComponent';
import { datosTemp } from '../contexto/QRContexto';

 

const pasajeEscolar = async () => {
    try {
        const respuesta = await fetch("http://localhost:3600/api/pasaje-escolar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = await respuesta.json();
        console.log("Respuesta:", data);
        return data;
    } catch (error) {
        console.error("Error:", error);
    }
};

const pasajeAdulto = async () => {
        try {
        const respuesta = await fetch("http://localhost:3600/api/pasaje-adulto", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = await respuesta.json();
        console.log("Respuesta:", data);
        return data;
    } catch (error) {
        console.error("Error:", error);
    }
};



export const PruebaComponent = () => {

    const [valorQR, setValorQR] = useState(null);


    const handlePasajeAdulto = async () => {
        const data = await pasajeAdulto();
        if (!data) return;

        // setValorQR(data.type_response.qr_data);
        
        datosTemp.setValorQR(data.type_response.qr_data);
    };

    const handlePasajeEscolar = async () => {
        const data = await pasajeEscolar();
        if (!data) return;

        setValorQR(data.type_response.qr_data);
    };



    return (
        <div>
           

            <h1>Prototipo 1 ChiriPay</h1>
            {/* <button onClick={verMiPOS}>Ver mi POS</button><br/> */}
            <button onClick={handlePasajeEscolar}>Crear Pasaje Escolar</button>
            <button onClick={handlePasajeAdulto}>Crear Pasaje Adulto</button><br/><br/>

            {/* {valorQR && <QRCode value={valorQR} />} */}

            <TablaBoletosComponent />

        </div>

  )
}


