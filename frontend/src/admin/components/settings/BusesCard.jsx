import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

const cleanPlate = (text) => text.replace(/[\s-]/g, '').toUpperCase();

// Mercado Pago pide un nombre y un external_id por bus. Para no escribirlos a mano se sugieren a partir
// de lo que ya se digitó: el nombre desde la patente y el external_id (solo letras y números) desde el nombre.
const suggestName = (plate) => (plate ? `Bus ${plate}` : '');
const suggestExternalId = (name) => name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 40);

export default function BusesCard() {
  const { config, addBus, editBus, removeBus, restoreBus, assignDriver, unassignDriver } = useAdmin();
  const [editingId, setEditingId] = useState(null);
  const [plate, setPlate] = useState('');
  const [name, setName] = useState(null); // null = sin tocar: se muestra la sugerencia
  const [externalId, setExternalId] = useState(null);
  const [newDriverId, setNewDriverId] = useState(''); // chofer opcional al registrar un bus

  const driverName = new Map(config.drivers.map((d) => [String(d.id), d.name]));
  // Se pueden asignar los choferes activos y los inactivos (asignarlos los activa); los dados de baja no.
  const assignable = config.drivers.filter((d) => !d.removed);
  const nameValue = name ?? suggestName(cleanPlate(plate));
  const externalIdValue = externalId ?? suggestExternalId(nameValue);

  const reset = () => {
    setEditingId(null);
    setPlate('');
    setName(null);
    setExternalId(null);
    setNewDriverId('');
  };

  const startEdit = (bus) => {
    setEditingId(bus.id);
    setPlate(bus.plate);
    setName(bus.name);
    setExternalId(bus.externalId);
  };

  const submit = async (e) => {
    e.preventDefault();
    const payload = { plate: plate.trim().toUpperCase(), name: nameValue.trim(), externalId: externalIdValue.trim() };
    if (editingId) {
      if (await editBus(editingId, payload)) reset();
      return;
    }
    const bus = await addBus(payload);
    if (!bus) return;
    const driver = assignable.find((d) => String(d.id) === newDriverId);
    if (driver) await assignDriver(bus.id, driver.id); // si falla, el bus ya quedó registrado y el aviso explica por qué
    reset();
  };

  const remove = async (bus) => {
    if (await removeBus(bus.id)) {
      if (editingId === bus.id) reset();
    }
  };

  // El valor viene como texto: se busca el chofer para conservar el tipo de su id.
  const changeDriver = (bus, value) => {
    const driver = assignable.find((d) => String(d.id) === value);
    return driver ? assignDriver(bus.id, driver.id) : unassignDriver(bus.id);
  };

  return (
    <section className="card">
      <h2>Buses</h2>
      {config.buses.map((b) => (
        <div className="row" key={b.id}>
          <b className={`grow${b.active ? '' : ' muted'}`}>{b.plate}</b>
          <small>{b.name}</small>
          {b.active ? (
            <select aria-label={`Chofer del bus ${b.plate}`} value={b.driverId == null ? '' : String(b.driverId)}
              onChange={(e) => changeDriver(b, e.target.value)}>
              <option value="">Sin chofer</option>
              {assignable.map((d) => (
                <option key={d.id} value={String(d.id)}>{d.name}{d.active ? '' : ' (inactivo)'}</option>
              ))}
            </select>
          ) : (
            <span>{driverName.get(String(b.driverId)) ?? 'Sin chofer'}</span>
          )}
          <span className={`st${b.active ? ' on' : ''}`}>{b.active ? 'Activo' : 'De baja'}</span>
          {b.active ? (
            <>
              <button className="btn o" onClick={() => startEdit(b)}>Editar</button>
              <button className="btn o" onClick={() => remove(b)}>Dar de baja</button>
            </>
          ) : (
            <button className="btn o" onClick={() => restoreBus(b.id)}>Reactivar</button>
          )}
        </div>
      ))}
      <form className="fm" onSubmit={submit}>
        <input type="text" placeholder="Patente (ej: AB1234)" aria-label="Patente del bus" required maxLength={8}
          value={plate} onChange={(e) => setPlate(e.target.value)} />
        <input type="text" placeholder="Nombre (ej: Bus 012 Recorrido 3)" aria-label="Nombre del bus" required maxLength={45}
          value={nameValue} onChange={(e) => setName(e.target.value)} />
        <input type="text" placeholder="ID externo (ej: BUS012LINEA003)" aria-label="ID externo del bus" required maxLength={40}
          value={externalIdValue} onChange={(e) => setExternalId(e.target.value)} />
        {!editingId && (
          <select aria-label="Chofer del bus (opcional)" value={newDriverId} onChange={(e) => setNewDriverId(e.target.value)}>
            <option value="">Sin chofer por ahora</option>
            {assignable.map((d) => (
              <option key={d.id} value={String(d.id)}>{d.name}{d.active ? '' : ' (inactivo)'}</option>
            ))}
          </select>
        )}
        <button className="btn" type="submit">{editingId ? 'Guardar cambios' : 'Registrar bus'}</button>
        {editingId && <button className="btn o" type="button" onClick={reset}>Cancelar</button>}
      </form>
    </section>
  );
}