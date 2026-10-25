import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

export default function RepartoCard() {
  const { config, saveDriverPct } = useAdmin();
  const [pct, setPct] = useState(config.driverPct);

  return (
    <section className="card">
      <h2>División de las ganancias</h2>
      <input type="range" className="slider" min="0" max="100" step="5" value={pct}
        aria-label="Porcentaje para choferes" onChange={(e) => setPct(Number(e.target.value))} />
      <p>Choferes {pct}%, empresa {100 - pct}%</p>
      <small>Se aplica a las ventas posteriores al cambio.</small>
      <div className="fm">
        <button className="btn" onClick={() => saveDriverPct(pct)}>Guardar división</button>
      </div>
    </section>
  );
}
