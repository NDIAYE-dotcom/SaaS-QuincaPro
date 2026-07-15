import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function TenantRoute() {
  const { isSuperAdmin } = useAuth();

  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;

  return <Outlet />;
}
