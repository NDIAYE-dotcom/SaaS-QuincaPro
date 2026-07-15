import { useNavigate } from 'react-router-dom';
import { LuLock, LuLogOut } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';
import { signOut } from '../../services/authService';
import './SubscriptionRequired.css';

const STATUS_LABELS = {
  en_attente_paiement: 'En attente de votre premier paiement',
  expire: 'Votre abonnement a expiré',
  suspendu: 'Votre compte a été suspendu',
};

export default function SubscriptionRequired() {
  const { entreprise } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/connexion', { replace: true });
  }

  const statusLabel = STATUS_LABELS[entreprise?.statut_abonnement] || 'Abonnement inactif';

  return (
    <div className="blocked-screen">
      <div className="blocked-screen__icon">
        <LuLock />
      </div>
      <h1>Accès bloqué</h1>
      <p>{statusLabel}</p>
      <p className="blocked-screen__hint">
        L'abonnement QuincaPro est de 5000 FCFA / mois. Le paiement en ligne (Wave, Orange Money, Free
        Money) sera bientôt disponible directement ici.
      </p>
      <button className="blocked-screen__signout" onClick={handleSignOut}>
        <LuLogOut /> Se déconnecter
      </button>
    </div>
  );
}
