import { useNavigate } from 'react-router-dom';
import { LuUserX, LuLogOut } from 'react-icons/lu';
import { signOut } from '../../services/authService';
import './AccountDisabled.css';

export default function AccountDisabled() {
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/connexion', { replace: true });
  }

  return (
    <div className="blocked-screen">
      <div className="blocked-screen__icon">
        <LuUserX />
      </div>
      <h1>Compte désactivé</h1>
      <p>Votre accès a été désactivé par l'administrateur de votre entreprise.</p>
      <p className="blocked-screen__hint">Contactez-le pour en savoir plus ou demander une réactivation.</p>
      <button className="blocked-screen__signout" onClick={handleSignOut}>
        <LuLogOut /> Se déconnecter
      </button>
    </div>
  );
}
