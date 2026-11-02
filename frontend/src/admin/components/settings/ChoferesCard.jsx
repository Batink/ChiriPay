import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

// El backend guarda el RUT como "12345678-5"; en pantalla se muestra con puntos.
const formatRut = (rut) => {
  const match = /^(\d+)-([\dK])$/.exec(rut);
  return match ? `${match[1].replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${match[2]}` : rut;
};

const statusOf = (d) => (d.removed ? 'De baja' : d.active ? 'Activo' : 'Inactivo');

export default function ChoferesCard() {
  const { config, addDriver, editDriver, toggleDriver, removeDriver, restoreDriver } = useAdmin();
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [email, setEmail] = useState('');
  const [account, setAccount] = useState('');

  const reset = () => {
    setEditingId(null);
    setName('');
    setRut('');
    setEmail('');
    setAccount('');
  };

  const startEdit = (driver) => {
    setEditingId(driver.id);
    setName(driver.name);
    setRut(formatRut(driver.rut));
    setEmail(driver.email);
    setAccount(driver.account);
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = { name: name.trim(), rut: rut.trim(), email: email.trim(), account: account.trim() };
    const saved = editingId ? await editDriver(editingId, payload) : await addDriver(payload);
    if (saved) reset();
  };

  const remove = async (driver) => {
    if (await removeDriver(driver.id)) {
      if (editingId === driver.id) reset();
    }
  };

  return (
    <section className="card">
      <h2>Choferes</h2>
      {config.drivers.map((d) => (
        <div className="row" key={d.id}>
          <b className={`grow${d.removed ? ' muted' : ''}`}>{d.name}</b>
          <small>{formatRut(d.rut)}</small>
          <small>{d.email}</small>
          <small>Cuenta MP {d.account}</small>
          <span className={`st${d.active ? ' on' : ''}`}>{statusOf(d)}</span>
          {d.removed ? (
            <button className="btn o" onClick={() => restoreDriver(d.id)}>Reactivar</button>
          ) : (
            <>
              <button className="btn o" onClick={() => startEdit(d)}>Editar</button>
              <button className="btn o" onClick={() => toggleDriver(d.id, !d.active)}>
                {d.active ? 'Desactivar' : 'Activar'}
              </button>
              <button className="btn o" onClick={() => remove(d)}>Dar de baja</button>
            </>
          )}
        </div>
      ))}
      <form className="fm" onSubmit={submit}>
        <input type="text" placeholder="Nombre completo" aria-label="Nombre del chofer" required maxLength={80}
          value={name} onChange={(e) => setName(e.target.value)} />
        <input type="text" placeholder="RUT (ej: 12.345.678-5)" aria-label="RUT del chofer" required maxLength={12}
          value={rut} onChange={(e) => setRut(e.target.value)} />
        <input type="email" placeholder="Correo" aria-label="Correo del chofer" required
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="text" inputMode="numeric" placeholder="ID cuenta Mercado Pago" aria-label="ID de la cuenta de Mercado Pago del chofer" required maxLength={20}
          value={account} onChange={(e) => setAccount(e.target.value)} />
        <button className="btn" type="submit">{editingId ? 'Guardar cambios' : 'Registrar chofer'}</button>
        {editingId && <button className="btn o" type="button" onClick={reset}>Cancelar</button>}
      </form>
    </section>
  );
}