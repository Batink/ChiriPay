import { money, num, sumBy } from '../utils';

export default function KpiCards({ tickets, buses, rangeText }) {
  const total = sumBy(tickets, 'amount');
  const toDrivers = sumBy(tickets, 'driverAmount');
  const toCompany = sumBy(tickets, 'companyAmount');
  const active = buses.filter((b) => b.active).length;

  return (
    <div className="g k">
      <div className="card hero">
        <p>Total recaudado</p>
        <strong>{money(total)}</strong>
        <small>{rangeText}</small>
      </div>
      <div className="card">
        <p>Boletos vendidos</p>
        <strong>{num(tickets.length)}</strong>
        <small>Promedio {money(tickets.length ? total / tickets.length : 0)} por boleto</small>
      </div>
      <div className="card">
        <p>Buses activos</p>
        <strong>{active} de {buses.length}</strong>
        <small>En ruta ahora</small>
      </div>
      <div className="card">
        <p>Para la empresa</p>
        <strong>{money(toCompany)}</strong>
        <small>Choferes: {money(toDrivers)}</small>
      </div>
    </div>
  );
}
