import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TablaBoletosComponent } from './TablaBoletosComponent';

const crearPasaje = async (endpoint) => {
    try {
        const respuesta = await fetch(`http://localhost:3600/api/${endpoint}`, {
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
        return null;
    }
};

export const SeleccionPasajeComponent = () => {

    const navigate = useNavigate();

    const irAQR = async (endpoint, titulo) => {
        const data = await crearPasaje(endpoint);

        if (!data || !data.type_response) {
            alert("No se pudo generar el QR, intenta nuevamente");
            return;
        }

        // La página del QR consulta el backend por su cuenta (polling a
        // /api/orden-actual), así que si ya está abierta en otra ventana o
        // dispositivo se va a actualizar sola. Este navigate es solo para
        // comodidad si estás probando todo en la misma pestaña.
        
        // navigate("/qr");
    };

    return (
        <div>
            <h1>Prototipo 1 ChiriPay</h1>
            <button onClick={() => irAQR("pasaje-escolar", "Pasaje Escolar")}>
                Crear Pasaje Escolar
            </button>
            <button onClick={() => irAQR("pasaje-adulto", "Pasaje Adulto")}>
                Crear Pasaje Adulto
            </button>


            <TablaBoletosComponent />
        </div>
    );
};