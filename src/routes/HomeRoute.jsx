import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../shared/LoadingScreen';
import Landing from '../pages/Landing/Landing';

export default function HomeRoute() {
  const { session, loading, isSuperAdmin } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Landing />;
  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;

  return <Navigate to="/tableau-de-bord" replace />;
}
