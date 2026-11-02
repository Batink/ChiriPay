/*
 * Datos de prueba en memoria. Se usan para todo lo que tu backend aún no expone
 * (ver los flags LIVE de api.js). Mantiene exactamente la misma forma de datos
 * que devuelve api.js, así que el resto del panel no nota la diferencia.
 */

const latency = (value, ms = 150) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

let nextId = 100;

/* ---------- Datos de prueba ---------- */
const db = {
  driverPct: 20,
  types: [
    { id: 1, name: 'Regular', price: 1500 },
    { id: 2, name: 'Escolar', price: 500 },
    { id: 3, name: 'Adulto Mayor', price: 1000 },
  ],
  drivers: ['Juan Pérez', 'María Soto', 'Luis Rojas', 'Ana Vera', 'Pedro Díaz', 'Sofía Mella'].map(
    (name, i) => ({ id: i + 1, name, rut: '', email: '', account: '', active: i !== 4, removed: false })
  ),
  buses: ['BXRT 11', 'BXRT 12', 'BXRT 13', 'BXRT 14', 'BXRT 15', 'BXRT 16'].map((plate, i) => ({
    id: i + 1,
    plate,
    name: `Bus ${plate}`,
    externalId: plate.replace(/\s/g, ''),
    driverId: i + 1,
    active: i !== 4,
  })),
  tickets: [],
};

(function seedTickets() {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const now = Date.now();
  const list = [];
  for (const bus of db.buses) {
    for (let day = 0; day < 30; day++) {
      if (!bus.active && day < 3) continue;
      const count = 45 + Math.floor(rnd() * 35);
      for (let i = 0; i < count; i++) {
        const p = rnd();
        const hour = p < 0.3 ? 6.5 + rnd() * 2.5 : p < 0.6 ? 16.5 + rnd() * 2.5 : 7 + rnd() * 14;
        const d = new Date(now);
        d.setDate(d.getDate() - day);
        d.setHours(Math.floor(hour), Math.floor((hour % 1) * 60), 0, 0);
        if (d.getTime() > now) continue;
        const q = rnd();
        const type = db.types[q < 0.6 ? 0 : q < 0.85 ? 1 : 2];
        const driverAmount = Math.round((type.price * db.driverPct) / 100);
        list.push({
          ts: d.getTime(),
          busId: bus.id,
          driverId: bus.driverId,
          typeId: type.id,
          amount: type.price,
          driverAmount,
          companyAmount: type.price - driverAmount,
        });
      }
    }
  }
  db.tickets = list.sort((a, b) => a.ts - b.ts).map((t, i) => ({ id: 823301 + i * 7, ...t }));
})();

/* ---------- Lecturas ---------- */
export const getTypes = () => latency(structuredClone(db.types)); //            GET /tipos-pasaje
export const getDrivers = () => latency(structuredClone(db.drivers)); //        GET /choferes
export const getBuses = () => latency(structuredClone(db.buses)); //            GET /buses
export const getDriverPct = () => latency(db.driverPct); //                     GET /reparto

/** GET /boletos?desde=&hasta=&chofer=&bus=  (filtra en el servidor si el volumen es grande) */
export function getTickets({ from, to, driverId, busId }) {
  const list = db.tickets.filter(
    (t) =>
      t.ts >= from &&
      t.ts <= to &&
      (!driverId || t.driverId === Number(driverId)) &&
      (!busId || t.busId === Number(busId))
  );
  return latency(list);
}

/* ---------- Escrituras ---------- */
/** PUT /tipos-pasaje: recibe la lista completa (los tipos nuevos llegan con id null) y devuelve la lista guardada. */
export function saveTypes(types) {
  db.types = types.map((t) => ({
    id: t.id ?? nextId++,
    name: t.name.trim(),
    price: Number(t.price) || 0,
  }));
  return latency(structuredClone(db.types));
}

/** PUT /reparto: porcentaje que recibe el chofer (el resto va a la empresa). */
export function saveDriverPct(pct) {
  db.driverPct = pct;
  return latency(pct);
}

/** POST /choferes */
export function createDriver({ name, rut, email, account }) {
  const driver = { id: nextId++, name, rut, email, account, active: true, removed: false };
  db.drivers.push(driver);
  return latency(structuredClone(driver));
}

/** PUT /choferes/:id: solo cambia los campos que vengan definidos; removed:false reactiva (y deja activo). */
export function updateDriver(id, { name, rut, email, account, active, removed }) {
  const driver = db.drivers.find((d) => d.id === id);
  const reactivating = driver.removed && removed === false;
  const patch = { name, rut, email, account, active };
  for (const [key, value] of Object.entries(patch)) if (value !== undefined) driver[key] = value;
  if (reactivating) {
    driver.removed = false;
    driver.active = active ?? true;
  }
  return latency(structuredClone(driver));
}

/** DELETE /choferes/:id: baja lógica y desvincula al chofer de sus buses. */
export function removeDriver(id) {
  const driver = db.drivers.find((d) => d.id === id);
  driver.removed = true;
  driver.active = false;
  let unlinked = 0;
  for (const bus of db.buses) {
    if (bus.driverId === id) {
      bus.driverId = null;
      unlinked += 1;
    }
  }
  return latency({ driver: structuredClone(driver), unlinked });
}

/** POST /buses */
export function createBus({ plate, name, externalId }) {
  const bus = { id: nextId++, plate, name, externalId, driverId: null, active: true };
  db.buses.push(bus);
  return latency(structuredClone(bus));
}

/** PUT /buses/:id: solo cambia los campos que vengan definidos. */
export function updateBus(id, { plate, name, externalId, active }) {
  const bus = db.buses.find((b) => b.id === id);
  const patch = { plate, name, externalId, active };
  for (const [key, value] of Object.entries(patch)) if (value !== undefined) bus[key] = value;
  return latency(structuredClone(bus));
}

/** DELETE /buses/:id: baja lógica. */
export function removeBus(id) {
  return updateBus(id, { active: false });
}