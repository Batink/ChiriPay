import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

export default function TarifasCard() {
  const { config, saveTypes } = useAdmin();
  const [draft, setDraft] = useState(config.types);

  const edit = (i, patch) => setDraft((d) => d.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const save = async () => {
    const clean = draft.filter((t) => t.name.trim());
    const saved = await saveTypes(clean);
    if (saved) setDraft(saved);
  };

  return (
    <section className="card">
      <h2>Tipos de pasaje</h2>
      {draft.map((t, i) => (
        <div className="row" key={t.id ?? `nuevo-${i}`}>
          <input type="text" aria-label="Nombre del tipo de pasaje" placeholder="Nombre"
            value={t.name} onChange={(e) => edit(i, { name: e.target.value })} />
          <input type="number" className="amount" min="0" step="50" aria-label="Monto"
            value={t.price} onChange={(e) => edit(i, { price: e.target.value })} />
        </div>
      ))}
      <div className="fm">
        <button className="btn o" onClick={() => setDraft((d) => [...d, { id: null, name: '', price: 0 }])}>
          Agregar tipo
        </button>
        <button className="btn" onClick={save}>Guardar tarifas</button>
      </div>
    </section>
  );
}
