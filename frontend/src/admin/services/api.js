/*
 * Capa de datos de ChiriPay Admin conectada al backend Express (puerto 3600, prefijo /api).
 *
 * Hoy tu backend solo tiene pagos (GET /api/pagos, el webhook de MercadoPago ya guardado en Mongo).
 * Todo lo demás que necesita el panel (tipos de pasaje, choferes, buses, reparto) todavía no existe,
 * así que esas partes siguen saliendo de mock.js. Cuando crees un endpoint, pasa su flag a true.
 *
 * URL del backend: variable REACT_APP_API_URL (archivo .env en frontend/, reinicia `npm start` al cambiarla).
 * Si no existe, usa http://localhost:3600/api. Tu backend ya tiene cors() abierto, no hace falta proxy.
 *
 * Formas de datos que usa el panel (en inglés, internas):
 *   tipo     { id, name, price }
 *   chofer   { id, name, email, active }
 *   bus      { id, plate, name, externalId, driverId, active }
 *   boleto   { id, ts, busId, driverId, typeId, amount, driverAmount, companyAmount }
 */
import * as mock from './mock.js';

let ENV;
try {
  ENV = process.env.REACT_APP_API_URL; // CRA lo reemplaza al compilar
} catch {
  /* sin process (por ejemplo, Vite): se usa el valor por defecto */
}
const API = (ENV || 'http://localhost:3600/api').replace(/\/$/, '');

/** true = usa tu backend; false = usa mock.js. */
const LIVE = { tickets: true, types: false, drivers: false, buses: true, split: false };

/* ---------- Utilidades HTTP ---------- */
async function http(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    // El backend explica el problema en "mensaje" (ej: patente duplicada): se conserva para mostrarlo.
    let detail = '';
    try {
      detail = (await res.json()).mensaje ?? '';
    } catch {
      /* respuesta sin JSON */
    }
    const err = new Error(detail || `${method} ${path}: HTTP ${res.status}`);
    err.fromServer = Boolean(detail);
    throw err;
  }
  return res.json();
}
// Tu backend responde { status, <clave>: ... }; aceptamos también arreglos u objetos directos.
const list = (data, key) => (Array.isArray(data) ? data : data?.[key] ?? []);
const one = (data, key) => data?.[key] ?? data;
const idOf = (doc) => doc.id ?? doc._id;

/* ---------- Mappers: nombres del backend (español, Mongo) a los del panel ----------
 * Contrato que deben cumplir los endpoints nuevos:
 *   TipoPasaje { _id, nombre, precio }      Chofer { _id, nombre, correo, activo }
 *   Bus        { _id, patente, nombre, external_id, choferId, activo }      Reparto { porcentajeChofer }
 */
const toType = (d) => ({ id: idOf(d), name: d.nombre, price: d.precio });
const toDriver = (d) => ({ id: idOf(d), name: d.nombre, email: d.correo ?? '', active: d.activo !== false });
const toBus = (d) => ({
  id: idOf(d),
  plate: d.patente,
  name: d.nombre ?? '',
  externalId: d.external_id ?? '',
  driverId: d.choferId ?? null,
  active: d.activo !== false, // activo:false = bus dado de baja
});

/* ---------- Configuración ---------- */
export async function getTypes() {
  if (!LIVE.types) return mock.getTypes();
  return list(await http('GET', '/tipos-pasaje'), 'tipos').map(toType); //   GET /api/tipos-pasaje
}
export async function getDrivers() {
  if (!LIVE.drivers) return mock.getDrivers();
  return list(await http('GET', '/choferes'), 'choferes').map(toDriver); //  GET /api/choferes
}
export async function getBuses() {
  if (!LIVE.buses) return mock.getBuses();
  return list(await http('GET', '/buses'), 'resultado').map(toBus); //       GET /api/buses (incluye los dados de baja)
}
export async function getDriverPct() {
  if (!LIVE.split) return mock.getDriverPct();
  return (await http('GET', '/reparto')).porcentajeChofer; //                GET /api/reparto
}

/* ---------- Boletos (viene de GET /api/pagos) ---------- */

/* Tipo de pasaje según el prefijo de external_reference. Hoy tus controladores usan "PE-001" y "PA-001".
   Los nombres deben coincidir con los de los tipos de pasaje (sin importar mayúsculas). */
const TYPE_BY_PREFIX = { PE: 'escolar', PA: 'regular' };

/* Bus según el resto de external_reference: "PE-BXRT11" => bus con patente BXRT 11.
   Para que cada venta quede asociada a un bus, hay que generar la referencia así al crear la orden. */
const normPlate = (s) => String(s ?? '').replace(/[\s-]/g, '').toUpperCase();

// Fecha del pago: date_created del webhook; si falta, la fecha embebida en el _id de Mongo.
const createdAt = (p) => {
  const t = new Date(p.date_created).getTime();
  return Number.isNaN(t) ? parseInt(String(p._id).slice(0, 8), 16) * 1000 : t;
};

function toTickets(pagos, { types, buses, pct }) {
  const typeByName = new Map(types.map((t) => [t.name.toLowerCase(), t]));
  const busByPlate = new Map(buses.map((b) => [normPlate(b.plate), b]));

  // MercadoPago manda un webhook por cada cambio de estado de la orden: nos quedamos con el último de cada una.
  const latest = new Map();
  for (const p of pagos) {
    const orderId = p.data?.id;
    if (!orderId) continue;
    const prev = latest.get(orderId);
    if (!prev || createdAt(p) >= createdAt(prev)) latest.set(orderId, p);
  }

  return [...latest.values()]
    .filter((p) => p.data.status === 'processed') // solo pagos cobrados
    .map((p) => {
      const [prefix, ...rest] = String(p.data.external_reference ?? '').split('-');
      const type = typeByName.get(TYPE_BY_PREFIX[prefix.toUpperCase()]);
      const bus = busByPlate.get(normPlate(rest.join('')));
      const pay = p.data.transactions?.payments?.[0];
      const amount = Number(p.data.total_paid_amount ?? pay?.paid_amount ?? pay?.amount ?? 0);
      // OJO: el reparto se calcula con el porcentaje vigente. Para respetar HU-12 (monto fijo al momento
      // de la venta), guarda driverAmount y companyAmount en el Pago al registrarlo y léelos aquí.
      const driverAmount = Math.round((amount * pct) / 100);
      return {
        id: p.data.id,
        ts: createdAt(p),
        busId: bus?.id ?? null,
        driverId: bus?.driverId ?? null,
        typeId: type?.id ?? null,
        amount,
        driverAmount,
        companyAmount: amount - driverAmount,
      };
    })
    .sort((a, b) => a.ts - b.ts);
}

/** Hoy /api/pagos no acepta filtros ni paginación: se filtra aquí. Con mucho volumen, muévelo al backend. */
export async function getTickets({ from, to, driverId, busId }) {
  if (!LIVE.tickets) return mock.getTickets({ from, to, driverId, busId });
  const [data, types, buses, pct] = await Promise.all([http('GET', '/pagos'), getTypes(), getBuses(), getDriverPct()]);
  return toTickets(list(data, 'pagos'), { types, buses, pct }).filter(
    (t) =>
      t.ts >= from &&
      t.ts <= to &&
      (!driverId || String(t.driverId) === String(driverId)) &&
      (!busId || String(t.busId) === String(busId))
  );
}

/* ---------- Escrituras ---------- */
/** PUT /api/tipos-pasaje con la lista completa (tipos nuevos sin _id). Devuelve la lista guardada. */
export async function saveTypes(types) {
  if (!LIVE.types) return mock.saveTypes(types);
  const body = types.map((t) => ({ _id: t.id ?? undefined, nombre: t.name.trim(), precio: Number(t.price) || 0 }));
  return list(await http('PUT', '/tipos-pasaje', body), 'tipos').map(toType);
}

/** PUT /api/reparto con { porcentajeChofer } (el resto va a la empresa). */
export async function saveDriverPct(pct) {
  if (!LIVE.split) return mock.saveDriverPct(pct);
  await http('PUT', '/reparto', { porcentajeChofer: pct });
  return pct;
}

/** POST /api/choferes con { nombre, correo }. */
export async function createDriver({ name, email }) {
  if (!LIVE.drivers) return mock.createDriver({ name, email });
  return toDriver(one(await http('POST', '/choferes', { nombre: name, correo: email }), 'chofer'));
}

/** PATCH /api/choferes/:id con { activo }. */
export async function setDriverActive(id, active) {
  if (!LIVE.drivers) return mock.setDriverActive(id, active);
  return toDriver(one(await http('PATCH', `/choferes/${id}`, { activo: active }), 'chofer'));
}

/** POST /api/buses con { patente, nombre, external_id }. El chofer se vincula aparte. */
export async function createBus({ plate, name, externalId }) {
  if (!LIVE.buses) return mock.createBus({ plate, name, externalId });
  return toBus(one(await http('POST', '/buses', { patente: plate, nombre: name, external_id: externalId }), 'bus'));
}

/** PUT /api/buses/:id con los campos a cambiar (plate, name, externalId y/o active). */
export async function updateBus(id, { plate, name, externalId, active }) {
  if (!LIVE.buses) return mock.updateBus(id, { plate, name, externalId, active });
  const body = {};
  if (plate !== undefined) body.patente = plate;
  if (name !== undefined) body.nombre = name;
  if (externalId !== undefined) body.external_id = externalId;
  if (active !== undefined) body.activo = active;
  return toBus(one(await http('PUT', `/buses/${id}`, body), 'bus'));
}

/** DELETE /api/buses/:id: baja lógica. Devuelve el bus con active:false. */
export async function removeBus(id) {
  if (!LIVE.buses) return mock.removeBus(id);
  return toBus(one(await http('DELETE', `/buses/${id}`), 'bus'));
}