import { useAdmin } from '../context/AdminContext';
import { downloadFile, num, ticketsToCsv } from '../utils';
import TicketTable from '../components/TicketTable';

const LIMIT = 50;

export default function Boletos() {
  const { view, config } = useAdmin();
  const { tickets } = view;

  // El CSV respeta los filtros activos (HU-15) e incluye todos los boletos, no solo los visibles.
  const exportCsv = () =>
    downloadFile('boletos_chiripay.csv', ticketsToCsv(tickets, config.drivers, config.types));

  return (
    <section className="card">
      <div className="hd">
        <h2>Boletos vendidos ({num(tickets.length)})</h2>
        <button className="btn" onClick={exportCsv} disabled={!tickets.length}>Exportar CSV</button>
      </div>
      <TicketTable tickets={tickets} buses={config.buses} types={config.types} limit={LIMIT} />
      <small>Se muestran los últimos {LIMIT}. El CSV incluye todos los boletos del filtro.</small>
    </section>
  );
}
