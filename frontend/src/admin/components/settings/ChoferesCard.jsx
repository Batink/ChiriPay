import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

export default function ChoferesCard() {
  const { config, addDriver, toggleDriver } = useAdmin();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (await addDriver({ name: name.trim(), email: email.trim() })) {
      setName('');
      setEmail('');
    }
  };

  return (
    <section className="card">
      <h2>Choferes</h2>
      {config.drivers.map((d) => (
        <div className="row" key={d.id}>
          <b className="grow">{d.name}</b>
          <span className={`st${d.active ? ' on' : ''}`}>{d.active ? 'Activo' : 'Inactivo'}</span>
          <button className="btn o" onClick={() => toggleDriver(d.id, !d.active)}>
            {d.active ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ))}
      <form className="fm" onSubmit={submit}>
        <input type="text" placeholder="Nombre" aria-label="Nombre del chofer" required
          value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" placeholder="Correo" aria-label="Correo del chofer"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn" type="submit">Registrar chofer</button>
      </form>
    </section>
  );
}
