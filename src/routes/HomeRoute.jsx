import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingScreen from '../shared/LoadingScreen';
import Landing from '../pages/Landing/Landing';

const AUTH_LINK_ERROR_MESSAGES = {
  otp_expired: "Le lien a expiré. Merci de recommencer l'opération pour recevoir un nouveau lien.",
};

export default function HomeRoute() {
  const { session, loading, isSuperAdmin } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!session && window.location.hash.includes('error')) {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const errorCode = params.get('error_code');
    const message =
      AUTH_LINK_ERROR_MESSAGES[errorCode] ||
      "Le lien est invalide ou a expiré. Merci de recommencer l'opération pour recevoir un nouveau lien.";
    return <Navigate to={`/connexion?erreur=${encodeURIComponent(message)}`} replace />;
  }

  if (!session) return <Landing />;
  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;

  return <Navigate to="/tableau-de-bord" replace />;
}
