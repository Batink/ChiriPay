import { useMemo } from 'react';
import { money, num } from '../utils';

export default function BusTable({ tickets, buses, drivers, filters }) {
  const driverName = new Map(drivers.map((d) => [d.id, d.name]));

  const stats = useMemo(() => {
    const byBus = new Map();
    for (const t of tickets) {
      const s = byBus.get(t.busId) ?? { count: 0, amount: 0 };
      s.count += 1;
      s.amount += t.amount;
      byBus.set(t.busId, s);
    }
    return byBus;
  }, [tickets]);

  const visible = buses.filter(
    (b) =>
      (!filters.busId || String(b.id) === filters.busId) &&
      (!filters.driverId || String(b.driverId) === filters.driverId)
  );

  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>Bus</th><th>Chofer</th><th>Estado</th>
            <th className="r">Boletos</th><th className="r">Recaudado</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((b) => {
            const s = stats.get(b.id) ?? { count: 0, amount: 0 };
            return (
              <tr key={b.id}>
                <td>{b.plate}</td>
                <td>{driverName.get(b.driverId) ?? 'Sin chofer'}</td>
                <td><span className={`st${b.active ? ' on' : ''}`}>{b.active ? 'En ruta' : 'De baja'}</span></td>
                <td className="r">{num(s.count)}</td>
                <td className="r">{money(s.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}