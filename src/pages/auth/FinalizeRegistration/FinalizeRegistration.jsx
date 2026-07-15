import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { registerEntreprise } from '../../../services/authService';
import './FinalizeRegistration.css';

export default function FinalizeRegistration() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const { nom_entreprise: nomEntreprise, nom_complet: nomComplet, telephone } = user.user_metadata || {};

    if (!nomEntreprise || !nomComplet) {
      setError('Informations d’inscription introuvables. Merci de contacter le support.');
      return;
    }

    registerEntreprise({ nom: nomEntreprise, nomComplet, telephone })
      .then(async () => {
        await refreshProfile();
        navigate('/', { replace: true });
      })
      .catch((err) => setError(err.message));
  }, [user, navigate, refreshProfile]);

  return (
    <div className="finalize">
      {error ? <p className="finalize__error">{error}</p> : <p>Finalisation de votre inscription...</p>}
    </div>
  );
}
