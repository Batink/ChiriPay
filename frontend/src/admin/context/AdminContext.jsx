import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as api from '../services/api';
import { getSpan } from '../utils';

const AdminContext = createContext(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin debe usarse dentro de <AdminProvider>');
  return ctx;
}

const DEFAULT_FILTERS = { range: '7', from: '', to: '', driverId: '', busId: '' };

const readTheme = () => {
  try {
    return localStorage.getItem('cp-theme') || 'dark';
  } catch {
    return 'dark';
  }
};

export function AdminProvider({ children }) {
  const [theme, setTheme] = useState(readTheme);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [config, setConfig] = useState(null); // { types, drivers, buses, driverPct }
  const [view, setView] = useState({ tickets: [], span: getSpan(DEFAULT_FILTERS), filters: DEFAULT_FILTERS });
  const [error, setError] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const timer = useRef();

  const notify = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(''), 2400);
  }, []);

  // Tema: lo aplica Layout en su contenedor (data-theme); aquí solo se recuerda entre visitas.
  useEffect(() => {
    try {
      localStorage.setItem('cp-theme', theme);
    } catch {
      /* sin almacenamiento disponible */
    }
  }, [theme]);

  // Configuración: tipos de pasaje, choferes, buses y reparto.
  useEffect(() => {
    Promise.all([api.getTypes(), api.getDrivers(), api.getBuses(), api.getDriverPct()])
      .then(([types, drivers, buses, driverPct]) => setConfig({ types, drivers, buses, driverPct }))
      .catch(() => setError(true));
  }, []);

  // Boletos: se vuelven a pedir cada vez que cambia un filtro.
  useEffect(() => {
    let stale = false;
    const span = getSpan(filters);
    api
      .getTickets({ from: span[0], to: span[1], driverId: filters.driverId, busId: filters.busId })
      .then((tickets) => !stale && setView({ tickets, span, filters }))
      .catch(() => !stale && notify('No se pudieron cargar los boletos. Intenta de nuevo.'));
    return () => {
      stale = true;
    };
  }, [filters, notify]);

  /** Ejecuta una escritura; avisa el resultado y devuelve su valor (o null si falló). */
  const run = async (fn, okMsg) => {
    try {
      const value = await fn();
      notify(okMsg);
      return value;
    } catch (e) {
      // Si el backend explicó el problema (ej: patente duplicada) se muestra tal cual.
      notify(e.fromServer ? e.message : 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.');
      return null;
    }
  };

  const value = {
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    filters,
    updateFilters: (patch) => setFilters((f) => ({ ...f, ...patch })),
    config,
    view, // { tickets, span, filters }: los datos y el filtro con que se pidieron
    ready: config !== null,
    error,
    toastMsg,
    notify,

    saveTypes: (types) =>
      run(async () => {
        const saved = await api.saveTypes(types);
        setConfig((c) => ({ ...c, types: saved }));
        return saved;
      }, 'Tarifas guardadas'),

    saveDriverPct: (pct) =>
      run(async () => {
        await api.saveDriverPct(pct);
        setConfig((c) => ({ ...c, driverPct: pct }));
        return true;
      }, 'División guardada'),

    addDriver: (payload) =>
      run(async () => {
        const driver = await api.createDriver(payload);
        setConfig((c) => ({ ...c, drivers: [...c.drivers, driver] }));
        return true;
      }, 'Chofer registrado'),

    toggleDriver: (id, active) =>
      run(async () => {
        const driver = await api.setDriverActive(id, active);
        setConfig((c) => ({ ...c, drivers: c.drivers.map((d) => (d.id === id ? driver : d)) }));
        return true;
      }, active ? 'Chofer activado' : 'Chofer desactivado'),

    addBus: (payload) =>
      run(async () => {
        const bus = await api.createBus(payload);
        setConfig((c) => ({ ...c, buses: [...c.buses, bus] }));
        return true;
      }, 'Bus registrado'),

    editBus: (id, payload) =>
      run(async () => {
        const bus = await api.updateBus(id, payload);
        setConfig((c) => ({ ...c, buses: c.buses.map((b) => (b.id === id ? bus : b)) }));
        return true;
      }, 'Bus actualizado'),

    // Baja lógica: el bus sigue en la lista (config.buses) con active:false, así los boletos antiguos conservan su patente.
    removeBus: (id) =>
      run(async () => {
        const bus = await api.removeBus(id);
        setConfig((c) => ({ ...c, buses: c.buses.map((b) => (b.id === id ? bus : b)) }));
        return true;
      }, 'Bus dado de baja'),

    restoreBus: (id) =>
      run(async () => {
        const bus = await api.updateBus(id, { active: true });
        setConfig((c) => ({ ...c, buses: c.buses.map((b) => (b.id === id ? bus : b)) }));
        return true;
      }, 'Bus reactivado'),
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}