import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminProvider } from './context/AdminContext';
import { ADMIN_BASE } from './config';
import Layout from './components/Layout';
import Resumen from './pages/Resumen';
import Boletos from './pages/Boletos';
import Ajustes from './pages/Ajustes';
import './styles/admin.css';

/**
 * Panel de administración completo (contexto, rutas y estilos).
 * Se monta con una sola línea en tus rutas:
 *   <Route path="/admin/*" element={<AdminApp />} />
 */
export default function AdminApp() {
  return (
    <AdminProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Resumen />} />
          <Route path="boletos" element={<Boletos />} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to={ADMIN_BASE} replace />} />
        </Route>
      </Routes>
    </AdminProvider>
  );
}
