import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../shared/LoadingScreen';

export default function ProtectedRoute() {
  const { session, profile, loading, isSubscriptionActive } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/connexion" state={{ from: location }} replace />;
  if (!profile) return <Navigate to="/finalisation" replace />;
  if (!profile.actif) return <Navigate to="/compte-desactive" replace />;
  if (!isSubscriptionActive) return <Navigate to="/abonnement-requis" replace />;

  return <Outlet />;
}
