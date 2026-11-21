import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { MarcoPublico } from './MarcoPublico';
import { money } from '../admin/utils';

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

// Mercado Pago entrega el monto como texto ("500.00"): se muestra igual que en el panel ($1.500).
const formatearMonto = (monto) => {
    const numero = Number(monto);
    return Number.isFinite(numero) ? money(numero) : `$${monto}`;
};

const IconoCheck = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
);

const IconoCruz = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" />
    </svg>
);

export const QRComponent = () => {

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
            <MarcoPublico subtitulo="Pantalla de pago" estrecho>
                <section className="card">
                    <div className="hd"><h1 className="pub-h1">Falta indicar el bus</h1></div>
                    <p className="pub-nota">Abre esta página con la patente del bus en la dirección, por ejemplo: <code>/qr?bus=AB1234</code></p>
                </section>
            </MarcoPublico>
        );
    }

    if (!orden) {
        return (
            <MarcoPublico subtitulo="Pantalla de pago" patente={patente} estrecho>
                <section className="card pub-centro">
                    <div className="hd"><h1 className="pub-h1">Aún no hay ningún pasaje generado</h1></div>
                    {aviso && <p className="pub-nota">{aviso}</p>}
                    <p className="pub-nota">En cuanto se genere un pasaje en este bus, el QR va a aparecer acá solo.</p>
                </section>
            </MarcoPublico>
        );
    }

    const pagado = estado === "processed";
    const expirado = estado === "expired";
    // "created" es el estado con que Mercado Pago deja la orden recién creada; cualquier otro estado se muestra tal cual.
    const textoEstado = estado === "pendiente" || estado === "created" ? "Esperando pago…" : estado;

    return (
        <MarcoPublico subtitulo="Pantalla de pago" patente={patente} estrecho>
            <section className="card hero pub-centro">
                <h1 className="pub-titulo">{orden.titulo}</h1>
                <div className="pub-importe">{formatearMonto(orden.monto)}</div>
                <small>{pagado ? "Monto pagado" : "Monto a pagar"}</small>
            </section>

            {/* Región en vivo: los lectores de pantalla anuncian cuando cambia de "esperando" a "pago recibido" */}
            <div role="status" aria-live="polite">
                {pagado ? (
                    <section className="card pub-centro">
                        <div className="pub-icono ok"><IconoCheck /></div>
                        <h2 className="pub-estado-t">Pago recibido</h2>
                    </section>
                ) : expirado ? (
                    <section className="card pub-centro">
                        <div className="pub-icono"><IconoCruz /></div>
                        <h2 className="pub-estado-t">QR expirado</h2>
                        <p className="pub-nota">Pide al conductor que genere uno nuevo.</p>
                    </section>
                ) : (
                    <section className="card pub-centro">
                        <div className="pub-qr-caja" role="img" aria-label="Código QR para pagar el pasaje">
                            <QRCode value={orden.qrData} size={256} bgColor="#FFFFFF" fgColor="#000000" />
                        </div>
                        <p className="pub-nota">Escanea el código para pagar</p>
                        <span className="st pub-st">{textoEstado}</span>
                    </section>
                )}
            </div>
        </MarcoPublico>
    );
};
