import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';

export default function BusesCard() {
  const { config, addBus } = useAdmin();
  const [plate, setPlate] = useState('');
  const [driverId, setDriverId] = useState('');

  const driverName = new Map(config.drivers.map((d) => [d.id, d.name]));
  const activeDrivers = config.drivers.filter((d) => d.active);

  const submit = async (e) => {
    e.preventDefault();
    const driver = activeDrivers.find((d) => String(d.id) === driverId); // conserva el tipo original del id
    if (driver && (await addBus({ plate: plate.trim().toUpperCase(), driverId: driver.id }))) {
      setPlate('');
      setDriverId('');
    }
  };

  return (
    <section className="card">
      <h2>Buses</h2>
      {config.buses.map((b) => (
        <div className="row" key={b.id}>
          <b className="grow">{b.plate}</b>
          <span>{driverName.get(b.driverId)}</span>
        </div>
      ))}
      <form className="fm" onSubmit={submit}>
        <input type="text" placeholder="Patente" aria-label="Patente del bus" required
          value={plate} onChange={(e) => setPlate(e.target.value)} />
        <select aria-label="Chofer asignado" required value={driverId} onChange={(e) => setDriverId(e.target.value)}>
          <option value="">Elige un chofer</option>
          {activeDrivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button className="btn" type="submit">Registrar bus</button>
      </form>
    </section>
  );
}
