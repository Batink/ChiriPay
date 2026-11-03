import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';

const INTERVALO_POLLING_MS = 2500;

// Devuelve la última orden del bus y, si el backend rechazó la consulta (bus
// desconocido o dado de baja), el motivo para mostrarlo en pantalla.
const obtenerOrdenActual = async (patente) => {
    try {
        const respuesta = await fetch(`http://localhost:3600/api/orden-actual?patente=${encodeURIComponent(patente)}`);
        const data = await respuesta.json();
        return { orden: data.orden || null, aviso: data.status === "error" ? data.mensaje : "" };
    } catch (error) {
        console.error("Error consultando la orden actual:", error);
        return { orden: null, aviso: "" };
    }
};

const consultarEstado = async (referencia) => {
    try {
        const respuesta = await fetch(`http://localhost:3600/api/pago-estado/${referencia}`);
        const data = await respuesta.json();
        return data;
    } catch (error) {
        console.error("Error consultando estado del pago:", error);
        return null;
    }
};

export const QRComponent = () => {
    const navigate = useNavigate();

    // Cada bus tiene su propia pantalla: /qr?bus=AB1234
    const [params] = useSearchParams();
    const patente = params.get("bus");

    // No usamos el state de la navegación: esta pantalla puede estar abierta
    // en otra ventana o en otro dispositivo distinto al que generó el
    // pasaje, así que todo lo que muestra viene siempre del backend.
    const [orden, setOrden] = useState(null);
    const [estado, setEstado] = useState("pendiente");
    const [aviso, setAviso] = useState("");
    const referenciaMostrada = useRef(null);

    useEffect(() => {
        if (!patente) return;

        const revisar = async () => {
            const { orden: ordenActual, aviso } = await obtenerOrdenActual(patente);
            setAviso(aviso);

            // ¿Cambió la orden que hay que mostrar (se generó un pasaje nuevo,
            // en esta ventana o en cualquier otra)? Si es así, arrancamos de cero.
            if (ordenActual && ordenActual.externalReference !== referenciaMostrada.current) {
                referenciaMostrada.current = ordenActual.externalReference;
                setOrden(ordenActual);
                setEstado("pendiente");
            } else if (!ordenActual) {
                referenciaMostrada.current = null;
                setOrden(null);
            }

            // Si hay una orden en pantalla, revisamos si ya se pagó.
            if (referenciaMostrada.current) {
                const resultado = await consultarEstado(referenciaMostrada.current);
                if (resultado) setEstado(resultado.status);
            }
        };

        revisar(); // primera consulta inmediata, sin esperar el primer intervalo
        const intervalo = setInterval(revisar, INTERVALO_POLLING_MS);

        return () => clearInterval(intervalo);
    }, [patente]);

    if (!patente) {
        return (
            <div>
                <h1>Falta indicar el bus</h1>
                <p>Abre esta página con la patente del bus en la dirección, por ejemplo: /qr?bus=AB1234</p>
            </div>
        );
    }

    if (!orden) {
        return (
            <div>
                <h1>Aún no hay ningún pasaje generado</h1>
                {aviso && <p>{aviso}</p>}
                <p>En cuanto se genere un pasaje en este bus, el QR va a aparecer acá solo.</p>
                {/* <button onClick={() => navigate("/")}>Crear pasaje</button> */}
            </div>
        );
    }

    const pagado = estado === "processed";
    const expirado = estado === "expired";

    return (
        <div>
            <h1>{orden.titulo}</h1>
            <p>Monto: ${orden.monto}</p>

            {pagado ? (
                <h2>✅ Pago recibido</h2>
            ) : 
            
            expirado ? (
                <h2>❌ QR expirado</h2>
            ) :

            (
                <>
                    <QRCode value={orden.qrData} />
                    <p>Estado: {estado === "pendiente" ? "Esperando pago..." : estado}</p>
                </>
            )}

            <br />
            {/* <button onClick={() => navigate("/")}>Volver</button> */}
        </div>
    );
};