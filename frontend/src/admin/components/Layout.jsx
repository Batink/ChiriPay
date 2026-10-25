import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { ADMIN_BASE } from '../config';
import Filters from './Filters';

export default function Layout() {
  const { theme, toggleTheme, ready, error, toastMsg } = useAdmin();
  const { pathname } = useLocation();
  const showFilters = ready && !pathname.startsWith(`${ADMIN_BASE}/ajustes`);

  return (
    <div className="cp-admin" data-theme={theme}>
      <header className="top">
        <div className="brand">
          <b>ChiriPay</b>
          <span>Vista de administración</span>
        </div>
        <nav aria-label="Secciones">
          <NavLink to={ADMIN_BASE} end>Resumen</NavLink>
          <NavLink to={`${ADMIN_BASE}/boletos`}>Boletos</NavLink>
          <NavLink to={`${ADMIN_BASE}/ajustes`}>Ajustes</NavLink>
        </nav>
        <button className="btn o" onClick={toggleTheme}>
          {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </header>

      {showFilters && <Filters />}

      <main>
        {error ? (
          <p className="muted">No se pudieron cargar los datos. Recarga la página para intentar de nuevo.</p>
        ) : ready ? (
          <Outlet />
        ) : (
          <p className="muted">Cargando…</p>
        )}
      </main>

      <div className="toast" role="status" hidden={!toastMsg}>{toastMsg}</div>
    </div>
  );
}
