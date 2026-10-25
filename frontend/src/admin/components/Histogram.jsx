import { useMemo, useState } from 'react';
import { money, num, pad } from '../utils';

const W = 640, H = 230, PL = 46, PB = 26, PT = 10;
const DAY = 864e5;

/** Agrupa por hora si el rango cabe en un día; si no, por día. */
function buildBuckets(tickets, [start, end], metric) {
  const byHour = end - start <= DAY;
  const day0 = new Date(start);
  day0.setHours(0, 0, 0, 0);
  const buckets = [];

  if (byHour) {
    for (let h = 5; h < 24; h++) buckets.push({ label: `${pad(h)}:00`, value: 0 }); // el servicio parte ~5:00
  } else {
    for (const d = new Date(day0); d.getTime() <= end; d.setDate(d.getDate() + 1)) {
      buckets.push({ label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, value: 0 });
    }
  }

  for (const t of tickets) {
    const d = new Date(t.ts);
    const i = byHour ? d.getHours() - 5 : Math.round((d.setHours(0, 0, 0, 0) - day0.getTime()) / DAY);
    if (buckets[i]) buckets[i].value += metric === 'count' ? 1 : t.amount;
  }
  return buckets;
}

export default function Histogram({ tickets, span }) {
  const [metric, setMetric] = useState('count');
  const buckets = useMemo(() => buildBuckets(tickets, span, metric), [tickets, span, metric]);

  const max = Math.max(1, ...buckets.map((b) => b.value));
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const top = Math.ceil(max / magnitude) * magnitude;
  const plotH = H - PB - PT;
  const step = (W - PL - 8) / buckets.length;
  const labelEvery = Math.ceil(buckets.length / 12);
  const peak = buckets.reduce((m, b) => (b.value > m.value ? b : m), buckets[0]);

  const show = (v) => (metric === 'count' ? `${num(v)} boletos` : money(v));
  const tick = (v) => (metric === 'count' || v < 1000 ? num(v) : `${num(v / 1000)} mil`);
  const what = metric === 'count' ? 'boletos vendidos' : 'monto recaudado';

  return (
    <section className="card">
      <div className="hd">
        <h2>Boletos vendidos</h2>
        <div className="seg" role="group" aria-label="Métrica">
          <button aria-pressed={metric === 'count'} onClick={() => setMetric('count')}>Cantidad</button>
          <button aria-pressed={metric === 'amount'} onClick={() => setMetric('amount')}>Monto</button>
        </div>
      </div>

      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Histograma de ${what}`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const y = PT + plotH * (1 - i / 4);
          return (
            <g key={i}>
              <line className="grid" x1={PL} x2={W} y1={y} y2={y} />
              <text x={PL - 6} y={y + 4} textAnchor="end">{tick((top * i) / 4)}</text>
            </g>
          );
        })}
        {buckets.map((b, i) => {
          const h = (plotH * b.value) / top;
          const x = PL + i * step;
          return (
            <g key={b.label}>
              <rect className="bar" x={x + step * 0.15} y={H - PB - h} width={step * 0.7} height={h} rx="3">
                <title>{`${b.label}: ${show(b.value)}`}</title>
              </rect>
              {i % labelEvery === 0 && (
                <text x={x + step / 2} y={H - 8} textAnchor="middle">{b.label}</text>
              )}
            </g>
          );
        })}
      </svg>

      <small>
        {tickets.length ? `Punto más alto: ${peak.label}, ${show(peak.value)}` : 'Sin ventas con estos filtros'}
      </small>
    </section>
  );
}
