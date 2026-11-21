import React from 'react'
import { useState, useEffect } from 'react';
import { money, fmtDate, fmtTime } from '../admin/utils';

const INTERVALO_REFRESCO_MS = 5000;
const FILAS_VISIBLES = 20; // el backend entrega los pagos del más nuevo al más antiguo

// Estados de las órdenes de Mercado Pago que se conocen; cualquier otro se muestra tal cual.
const ESTADOS = { processed: "Pagado", created: "Creado", expired: "Expirado" };

export const TablaBoletosComponent = () => {

    const [pasajes, setPasajes] = useState([]);

    const conseguirDatos = async () => {
        try {
            const respuesta = await fetch(`http://localhost:3600/api/pagos`);
            const data = await respuesta.json();
            setPasajes(Array.isArray(data.pagos) ? data.pagos : []);
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

    const recientes = pasajes.slice(0, FILAS_VISIBLES);

    return (
        <section className="card">
            <div className="hd">
                <h2>Pagos recientes</h2>
                <small>Se actualiza solo cada {INTERVALO_REFRESCO_MS / 1000} segundos</small>
            </div>

            {recientes.length === 0 ? (
                <p className="empty">Todavía no hay pagos.</p>
            ) : (
                <div className="tw">
                    <table>
                        <thead>
                            <tr>
                                <th>Día</th>
                                <th>Hora</th>
                                <th className="pub-col-id">ID</th>
                                <th>Estado</th>
                                <th className="r">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recientes.map((pasaje, indice) => {
                                const ts = Date.parse(pasaje.date_created);
                                const estado = pasaje.data.status;
                                const monto = Number(pasaje.data.total_paid_amount);

                                return (
                                    <tr key={pasaje._id || indice}>
                                        <td>{Number.isNaN(ts) ? "—" : fmtDate(ts)}</td>
                                        <td>{Number.isNaN(ts) ? "—" : fmtTime(ts)}</td>
                                        <td className="pub-col-id">{pasaje.data.id}</td>
                                        <td><span className={`st${estado === "processed" ? " on" : ""}`}>{ESTADOS[estado] || estado}</span></td>
                                        <td className="r">{Number.isFinite(monto) ? money(monto) : "—"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    )
}
