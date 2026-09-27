import React from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
 
import { SeleccionPasajeComponent } from '../components/SeleccionPasajeComponent';
import { QRComponent } from '../components/QRComponent';
 
export const Rutas = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<SeleccionPasajeComponent />} />
                <Route path="/qr" element={<QRComponent />} />
            </Routes>
        </BrowserRouter>
    );
};
 