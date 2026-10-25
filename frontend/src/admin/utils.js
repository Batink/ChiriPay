export const pad = (n) => String(n).padStart(2, '0');
export const money = (n) => '$' + Math.round(n).toLocaleString('es-CL');
export const num = (n) => Math.round(n).toLocaleString('es-CL');

export const fmtDate = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};
export const fmtTime = (ts) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const sumBy = (list, key) => list.reduce((acc, item) => acc + item[key], 0);

export const RANGES = [
  { id: '0', label: 'Hoy' },
  { id: '7', label: '7 días' },
  { id: '30', label: '30 días' },
  { id: 'c', label: 'Personalizado' },
];

/** Devuelve [inicio, fin] en milisegundos según el rango elegido. */
export function getSpan({ range, from, to }) {
  const end = Date.now();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === 'c') {
    return [
      from ? new Date(`${from}T00:00`).getTime() : start.getTime(),
      to ? new Date(`${to}T23:59:59`).getTime() : end,
    ];
  }
  start.setDate(start.getDate() - (range === '0' ? 0 : Number(range) - 1));
  return [start.getTime(), end];
}

export function rangeLabel({ range }, [start, end]) {
  if (range === '0') return 'Hoy';
  if (range === '7' || range === '30') return `Últimos ${range} días`;
  return `${fmtDate(start)} al ${fmtDate(end)}`;
}

const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;

/** CSV con las columnas pedidas en HU-15. El BOM inicial hace que Excel respete las tildes. */
export function ticketsToCsv(tickets, drivers, types) {
  const driverName = new Map(drivers.map((d) => [d.id, d.name]));
  const typeName = new Map(types.map((t) => [t.id, t.name]));
  const header = ['fecha', 'hora', 'conductor', 'tipo de pasaje', 'monto total', 'monto conductor', 'monto empresa'];
  const lines = tickets.map((t) =>
    [
      fmtDate(t.ts),
      fmtTime(t.ts),
      cell(driverName.get(t.driverId) ?? ''),
      cell(typeName.get(t.typeId) ?? ''),
      t.amount,
      t.driverAmount,
      t.companyAmount,
    ].join(',')
  );
  return '\ufeff' + [header.join(','), ...lines].join('\n');
}

export function downloadFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
