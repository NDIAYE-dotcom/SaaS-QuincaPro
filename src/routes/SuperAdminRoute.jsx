import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SuperAdminRoute() {
  const { isSuperAdmin } = useAuth();

  if (!isSuperAdmin) return <Navigate to="/" replace />;

  return <Outlet />;
}
