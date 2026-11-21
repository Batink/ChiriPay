/*
 * Capa de datos de ChiriPay Admin conectada al backend Express (puerto 3600, prefijo /api).
 *
 * El backend ya tiene boletos (GET /api/boletos, con filtros), choferes, buses (con su chofer asignado) y el reparto.
 * Lo único que todavía sale de mock.js son los tipos de pasaje (flag types). Cuando crees ese endpoint, pasa su flag a true.
 *
 * URL del backend: variable REACT_APP_API_URL (archivo .env en frontend/, reinicia `npm start` al cambiarla).
 * Si no existe, usa http://localhost:3600/api. Tu backend ya tiene cors() abierto, no hace falta proxy.
 *
 * Formas de datos que usa el panel (en inglés, internas):
 *   tipo     { id, name, price }
 *   chofer   { id, name, rut, email, account, active, removed }
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
const LIVE = { tickets: true, types: false, drivers: true, buses: true, split: true };

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
 *   TipoPasaje { _id, nombre, precio }      Chofer { _id, nombre, rut, correo, cuenta, activo, baja }
 *   Bus        { _id, patente, nombre, external_id, choferId, activo }      Reparto { porcentajeChofer }
 */
const toType = (d) => ({ id: idOf(d), name: d.nombre, price: d.precio });
const toDriver = (d) => ({
  id: idOf(d),
  name: d.nombre,
  rut: d.rut ?? '',
  email: d.correo ?? '',
  account: d.cuenta ?? '', // ID de la cuenta de Mercado Pago, para transferirle al chofer
  active: d.activo !== false,
  removed: d.baja === true, // baja lógica; un chofer dado de baja siempre sale inactivo
});
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
  return list(await http('GET', '/choferes'), 'resultado').map(toDriver); //  GET /api/choferes (incluye los dados de baja)
}
export async function getBuses() {
  if (!LIVE.buses) return mock.getBuses();
  return list(await http('GET', '/buses'), 'resultado').map(toBus); //       GET /api/buses (incluye los dados de baja)
}
export async function getDriverPct() {
  if (!LIVE.split) return mock.getDriverPct();
  return (await http('GET', '/reparto')).porcentajeChofer; //                GET /api/reparto
}

/* ---------- Boletos (vienen de GET /api/boletos) ---------- */

/* Tipo de pasaje según el prefijo de external_reference ("PE-<uuid>", "PA-<uuid>").
   Los nombres deben coincidir con los de los tipos de pasaje (sin importar mayúsculas). */
const TYPE_BY_PREFIX = { PE: 'escolar', PA: 'regular' };

/* El backend entrega un boleto por orden cobrada, con su bus, su chofer y el reparto fijados al momento
   de la venta (HU-12). Los pagos anteriores a esa versión llegan sin bus ni chofer: "sin atribuir". */
const toTicket = (d, typeByName) => ({
  id: d.id,
  ts: new Date(d.fecha).getTime(),
  busId: d.busId ?? null,
  driverId: d.choferId ?? null,
  typeId: typeByName.get(TYPE_BY_PREFIX[String(d.referencia ?? '').split('-')[0].toUpperCase()])?.id ?? null,
  amount: d.monto,
  driverAmount: d.monto_chofer,
  companyAmount: d.monto_empresa,
});

/**
 * GET /api/boletos: el backend filtra por rango de fechas (desde, hasta), bus (busId) y chofer (choferId).
 * Con un bus o un chofer elegido no llegan los boletos sin atribuir; sin esos filtros sí.
 */
export async function getTickets({ from, to, driverId, busId }) {
  if (!LIVE.tickets) return mock.getTickets({ from, to, driverId, busId });
  const query = new URLSearchParams();
  if (Number.isFinite(from)) query.set('desde', new Date(from).toISOString());
  if (Number.isFinite(to)) query.set('hasta', new Date(to).toISOString());
  if (driverId) query.set('choferId', driverId);
  if (busId) query.set('busId', busId);
  const [data, types] = await Promise.all([http('GET', `/boletos?${query}`), getTypes()]);
  const typeByName = new Map(types.map((t) => [t.name.toLowerCase(), t]));
  return list(data, 'resultado').map((d) => toTicket(d, typeByName));
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

/** POST /api/choferes con { nombre, rut, correo, cuenta }: los cuatro son obligatorios. */
export async function createDriver({ name, rut, email, account }) {
  if (!LIVE.drivers) return mock.createDriver({ name, rut, email, account });
  return toDriver(one(await http('POST', '/choferes', { nombre: name, rut, correo: email, cuenta: account }), 'chofer'));
}

/** PUT /api/choferes/:id con los campos a cambiar (name, rut, email, account, active y/o removed:false para reactivar). */
export async function updateDriver(id, { name, rut, email, account, active, removed }) {
  if (!LIVE.drivers) return mock.updateDriver(id, { name, rut, email, account, active, removed });
  const body = {};
  if (name !== undefined) body.nombre = name;
  if (rut !== undefined) body.rut = rut;
  if (email !== undefined) body.correo = email;
  if (account !== undefined) body.cuenta = account;
  if (active !== undefined) body.activo = active;
  if (removed !== undefined) body.baja = removed;
  return toDriver(one(await http('PUT', `/choferes/${id}`, body), 'chofer'));
}

/** Activa o desactiva a un chofer (disponibilidad). */
export const setDriverActive = (id, active) => updateDriver(id, { active });

/**
 * DELETE /api/choferes/:id: baja lógica. El backend lo desvincula de sus buses y avisa cuántos eran.
 * Devuelve { driver, unlinked }.
 */
export async function removeDriver(id) {
  if (!LIVE.drivers) return mock.removeDriver(id);
  const data = await http('DELETE', `/choferes/${id}`);
  return { driver: toDriver(one(data, 'chofer')), unlinked: data.buses_desvinculados ?? 0 };
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

/**
 * PUT /api/buses/:id/chofer con { choferId }. Si el bus ya tenía otro chofer, lo reemplaza.
 * Devuelve { bus, driver }: el chofer vuelve activo, porque asignarlo lo activa.
 */
export async function assignDriver(busId, driverId) {
  if (!LIVE.buses) return mock.assignDriver(busId, driverId);
  const data = await http('PUT', `/buses/${busId}/chofer`, { choferId: driverId });
  return { bus: toBus(one(data, 'bus')), driver: toDriver(one(data, 'chofer')) };
}

/** DELETE /api/buses/:id/chofer: deja el bus sin chofer. Devuelve el bus. */
export async function unassignDriver(busId) {
  if (!LIVE.buses) return mock.unassignDriver(busId);
  return toBus(one(await http('DELETE', `/buses/${busId}/chofer`), 'bus'));
}

/** DELETE /api/buses/:id: baja lógica. Devuelve el bus con active:false. */
export async function removeBus(id) {
  if (!LIVE.buses) return mock.removeBus(id);
  return toBus(one(await http('DELETE', `/buses/${id}`), 'bus'));
}