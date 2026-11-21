import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TablaBoletosComponent } from './TablaBoletosComponent';
import { MarcoPublico } from './MarcoPublico';

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

    // El bus se indica en la dirección: /?bus=AB1234 (el panel de administración tiene el enlace de cada bus)
    const [params] = useSearchParams();
    const patente = params.get("bus");

    // Endpoint que se está generando ahora (null = ninguno): mientras tanto los botones
    // quedan bloqueados, para que un doble toque no cree dos órdenes.
    const [generando, setGenerando] = useState(null);
    const [aviso, setAviso] = useState(null);
    const temporizador = useRef(null);

    const mostrarAviso = (texto, tipo = "info") => {
        clearTimeout(temporizador.current);
        setAviso({ texto, tipo });
        temporizador.current = setTimeout(() => setAviso(null), tipo === "error" ? 6000 : 4000);
    };

    useEffect(() => () => clearTimeout(temporizador.current), []);

    const irAQR = async (endpoint, titulo) => {
        if (generando) return;

        setGenerando(endpoint);
        const data = await crearPasaje(endpoint, patente);
        setGenerando(null);

        if (!data || !data.type_response) {
            mostrarAviso((data && data.mensaje) || "No se pudo generar el QR, intenta nuevamente", "error");
            return;
        }

        // La página del QR consulta el backend por su cuenta (polling a
        // /api/orden-actual), así que si ya está abierta en otra ventana o
        // dispositivo se va a actualizar sola: aquí solo se avisa que ya salió.
        mostrarAviso(`${titulo} generado: el QR ya está en la pantalla del bus`);
    };

    if (!patente) {
        return (
            <MarcoPublico subtitulo="Dispositivo del bus">
                <section className="card">
                    <div className="hd"><h1 className="pub-h1">Falta indicar el bus</h1></div>
                    <p className="pub-nota">Abre esta página con la patente del bus en la dirección, por ejemplo: <code>/?bus=AB1234</code></p>
                </section>
            </MarcoPublico>
        );
    }

    return (
        <MarcoPublico subtitulo="Dispositivo del bus" patente={patente} aviso={aviso}>
            <section className="card">
                <div className="hd">
                    <h1 className="pub-h1">Generar pasaje</h1>
                    <small>El QR aparece en la pantalla del bus</small>
                </div>
                <div className="pub-tiles">
                    <button className="btn pub-tile" disabled={generando !== null} aria-busy={generando === "pasaje-escolar"}
                        onClick={() => irAQR("pasaje-escolar", "Pasaje Escolar")}>
                        {generando === "pasaje-escolar" ? "Generando…" : "Crear Pasaje Escolar"}
                    </button>
                    <button className="btn pub-tile" disabled={generando !== null} aria-busy={generando === "pasaje-adulto"}
                        onClick={() => irAQR("pasaje-adulto", "Pasaje Adulto")}>
                        {generando === "pasaje-adulto" ? "Generando…" : "Crear Pasaje Adulto"}
                    </button>
                </div>
            </section>

            <TablaBoletosComponent />
        </MarcoPublico>
    );
};
