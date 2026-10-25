import { useAdmin } from '../context/AdminContext';
import { RANGES } from '../utils';

export default function Filters() {
  const { filters, updateFilters, config } = useAdmin();
  const { range, from, to, driverId, busId } = filters;

  return (
    <section className="flt" aria-label="Filtros">
      <div className="seg" role="group" aria-label="Rango de tiempo">
        {RANGES.map((r) => (
          <button key={r.id} aria-pressed={range === r.id} onClick={() => updateFilters({ range: r.id })}>
            {r.label}
          </button>
        ))}
      </div>

      {range === 'c' && (
        <span>
          <input type="date" aria-label="Desde" value={from} max={to || undefined}
            onChange={(e) => updateFilters({ from: e.target.value })} />{' '}
          <input type="date" aria-label="Hasta" value={to} min={from || undefined}
            onChange={(e) => updateFilters({ to: e.target.value })} />
        </span>
      )}

      <select aria-label="Chofer" value={driverId} onChange={(e) => updateFilters({ driverId: e.target.value })}>
        <option value="">Todos los choferes</option>
        {config.drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <select aria-label="Bus" value={busId} onChange={(e) => updateFilters({ busId: e.target.value })}>
        <option value="">Todos los buses</option>
        {config.buses.map((b) => <option key={b.id} value={b.id}>{b.plate}</option>)}
      </select>
    </section>
  );
}
