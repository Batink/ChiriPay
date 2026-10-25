import { useMemo } from 'react';
import { fmtDate, fmtTime, money } from '../utils';

/** Lista los boletos más recientes primero. `limit` recorta la cantidad mostrada. */
export default function TicketTable({ tickets, buses, types, limit }) {
  const rows = useMemo(
    () => [...tickets].sort((a, b) => b.ts - a.ts).slice(0, limit),
    [tickets, limit]
  );
  const plate = new Map(buses.map((b) => [b.id, b.plate]));
  const typeName = new Map(types.map((t) => [t.id, t.name]));

  if (!rows.length) {
    return <p className="empty">No hay boletos en este rango. Prueba con otro período o quita el filtro de chofer o bus.</p>;
  }

  return (
    <div className="tw">
      <table>
        <thead>
          <tr>
            <th>ID</th><th>Día</th><th>Hora</th><th>Bus</th><th>Tipo de pasaje</th><th className="r">Cobro</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{fmtDate(t.ts)}</td>
              <td>{fmtTime(t.ts)}</td>
              <td>{plate.get(t.busId) ?? 'Sin asignar'}</td>
              <td>{typeName.get(t.typeId) ?? 'Otro'}</td>
              <td className="r">{money(t.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
