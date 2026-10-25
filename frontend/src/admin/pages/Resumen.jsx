import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { rangeLabel } from '../utils';
import { ADMIN_BASE } from '../config';
import KpiCards from '../components/KpiCards';
import Histogram from '../components/Histogram';
import TypeBreakdown from '../components/TypeBreakdown';
import BusTable from '../components/BusTable';
import TicketTable from '../components/TicketTable';

export default function Resumen() {
  const { view, config } = useAdmin();
  const { tickets, span, filters } = view;
  const { types, buses, drivers } = config;

  return (
    <>
      <KpiCards tickets={tickets} buses={buses} rangeText={rangeLabel(filters, span)} />

      <div className="g m a">
        <Histogram tickets={tickets} span={span} />
        <TypeBreakdown tickets={tickets} types={types} />
      </div>

      <div className="g m">
        <section className="card">
          <h2>Buses</h2>
          <BusTable tickets={tickets} buses={buses} drivers={drivers} filters={filters} />
        </section>
        <section className="card">
          <div className="hd">
            <h2>Últimos boletos vendidos</h2>
            <Link className="btn o" to={`${ADMIN_BASE}/boletos`}>Ver todos</Link>
          </div>
          <TicketTable tickets={tickets} buses={buses} types={types} limit={6} />
        </section>
      </div>
    </>
  );
}
