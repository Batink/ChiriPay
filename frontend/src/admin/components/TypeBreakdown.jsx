import { money, num, sumBy } from '../utils';

export default function TypeBreakdown({ tickets, types }) {
  return (
    <section className="card">
      <h2>Por tipo de pasaje</h2>
      {types.map((type) => {
        const list = tickets.filter((t) => t.typeId === type.id);
        const share = tickets.length ? (list.length / tickets.length) * 100 : 0;
        return (
          <div className="tp" key={type.id}>
            <div>
              <b>{type.name}</b>
              <span>{num(list.length)} boletos, {money(sumBy(list, 'amount'))}</span>
            </div>
            <i style={{ width: `${share}%` }} />
          </div>
        );
      })}
    </section>
  );
}
