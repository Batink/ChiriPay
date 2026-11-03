import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TablaBoletosComponent } from './TablaBoletosComponent';

// Cada bus tiene su propio dispositivo: el backend necesita saber en qué bus se
// vende el pasaje para usar su POS y repartir las ganancias con su chofer.
const crearPasaje = async (endpoint, patente) => {
    try {
        const respuesta = await fetch(`http://localhost:3600/api/${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ patente })
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

    // El bus se indica en la dirección: /?bus=AB1234 (el panel de administración tiene el enlace de cada bus)
    const [params] = useSearchParams();
    const patente = params.get("bus");

    const irAQR = async (endpoint, titulo) => {
        const data = await crearPasaje(endpoint, patente);

        if (!data || !data.type_response) {
            alert((data && data.mensaje) || "No se pudo generar el QR, intenta nuevamente");
            return;
        }

        // La página del QR consulta el backend por su cuenta (polling a
        // /api/orden-actual), así que si ya está abierta en otra ventana o
        // dispositivo se va a actualizar sola. Este navigate es solo para
        // comodidad si estás probando todo en la misma pestaña.
        
        // navigate("/qr");
    };

    if (!patente) {
        return (
            <div>
                <h1>Falta indicar el bus</h1>
                <p>Abre esta página con la patente del bus en la dirección, por ejemplo: /?bus=AB1234</p>
            </div>
        );
    }

    return (
        <div>
            <h1>Prototipo 1 ChiriPay</h1>
            <p>Bus {patente}</p>
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