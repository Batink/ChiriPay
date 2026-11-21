import React, { useState } from 'react';
import '../admin/styles/admin.css'; // tokens, tipografía y componentes que comparten el panel y estas pantallas
import '../styles/publico.css';

const CLAVE_TEMA = 'cp-theme'; // la misma que usa el panel de administración: el tema elegido allí también vale aquí

// Igual que el panel: oscuro mientras nadie elija otro.
const leerTema = () => {
    try {
        return localStorage.getItem(CLAVE_TEMA) === 'light' ? 'light' : 'dark';
    } catch {
        return 'dark';
    }
};

// Marco común de las pantallas públicas (dispositivo del bus y pantalla del QR): misma cabecera, mismo tema
// y mismo aviso temporal que el panel de administración.
//   subtitulo: qué pantalla es, bajo el nombre de la marca.
//   patente:   bus al que pertenece la pantalla (se muestra en la cabecera).
//   estrecho:  columna angosta y centrada, para la pantalla del QR.
//   aviso:     { texto, tipo } para el aviso temporal; tipo "error" lo anuncia como alerta.
export const MarcoPublico = ({ subtitulo, patente, estrecho = false, aviso, children }) => {
    const [tema, setTema] = useState(leerTema);

    const alternarTema = () => {
        const siguiente = tema === 'dark' ? 'light' : 'dark';
        setTema(siguiente);
        try {
            localStorage.setItem(CLAVE_TEMA, siguiente);
        } catch {
            /* sin almacenamiento: el tema vale solo para esta visita */
        }
    };

    return (
        <div className="cp-admin cp-public" data-theme={tema}>
            <header className="top">
                <div className="brand">
                    <b>ChiriPay</b>
                    <span>{subtitulo}</span>
                </div>
                <div className="grow" />
                {patente && <span className="st on pub-bus">Bus {patente}</span>}
                <button className="btn o" onClick={alternarTema}>
                    {tema === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                </button>
            </header>

            <main className={`pub-main${estrecho ? ' pub-qr' : ''}`}>{children}</main>

            <div className="toast" role={aviso && aviso.tipo === 'error' ? 'alert' : 'status'} hidden={!(aviso && aviso.texto)}>
                {aviso && aviso.texto}
            </div>
        </div>
    );
};
