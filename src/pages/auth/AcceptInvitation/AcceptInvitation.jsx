import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LuLock, LuEye, LuEyeOff, LuMail } from 'react-icons/lu';
import { getInvitation, signUp, signIn, acceptInvitation } from '../../../services/authService';
import { ROLE_LABELS } from '../../../constants/roles';
import './AcceptInvitation.css';

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    getInvitation(token)
      .then((data) => setInvitation(data))
      .catch((err) => setError(err.message))
      .finally(() => setChecking(false));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      const { session, user } = await signUp({
        email: invitation.email,
        password,
        metadata: { invitation_token: token },
      });

      if (session) {
        await acceptInvitation(token);
        navigate('/tableau-de-bord', { replace: true });
        return;
      }

      // Supabase renvoie un "succès" sans session ni erreur quand l'email a déjà un compte
      // (pour ne pas permettre de deviner les emails inscrits) : identities est alors vide.
      // Sans ce contrôle, l'utilisateur voit "Vérifiez votre email" alors qu'aucun email n'est
      // envoyé et que son invitation n'est jamais acceptée — une impasse silencieuse.
      const alreadyRegistered = user && user.identities?.length === 0;
      if (alreadyRegistered) {
        try {
          await signIn({ email: invitation.email, password });
          await acceptInvitation(token);
          navigate('/tableau-de-bord', { replace: true });
        } catch {
          setError(
            `Un compte existe déjà avec l'adresse ${invitation.email}. Connectez-vous avec votre mot de passe habituel pour rejoindre ${invitation.entreprise_nom}.`,
          );
        }
        return;
      }

      setEmailSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <p className="auth-form__subtitle">Vérification de l'invitation...</p>;
  }

  if (!invitation || !invitation.valide) {
    return (
      <div className="auth-form">
        <h1>Invitation invalide</h1>
        <p className="auth-form__subtitle">
          Ce lien d'invitation est introuvable, a déjà été utilisé, ou a expiré. Contactez
          l'administrateur de votre entreprise pour en recevoir un nouveau.
        </p>
        <Link to="/connexion" className="auth-form__link-inline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  if (emailSent) {
    return (
      <div className="auth-form">
        <h1>Vérifiez votre email</h1>
        <p className="auth-form__subtitle">
          Un lien de confirmation a été envoyé à <strong>{invitation.email}</strong>. Cliquez dessus
          pour activer votre compte et rejoindre <strong>{invitation.entreprise_nom}</strong>.
        </p>
        <Link to="/connexion" className="auth-form__link-inline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Rejoindre {invitation.entreprise_nom}</h1>
      <p className="auth-form__subtitle">
        {invitation.nom_complet} · {ROLE_LABELS[invitation.role]}
        <br />
        Créez votre mot de passe pour activer votre compte.
      </p>

      {error && <div className="auth-form__error">{error}</div>}

      <label className="auth-field">
        <span>Email</span>
        <div className="auth-field__input">
          <LuMail />
          <input type="email" value={invitation.email} disabled />
        </div>
      </label>

      <label className="auth-field">
        <span>Mot de passe</span>
        <div className="auth-field__input">
          <LuLock />
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            placeholder="8 caractères minimum"
          />
          <button
            type="button"
            className="auth-field__toggle"
            onClick={() => setShowPassword((v) => !v)}
            aria-label="Afficher le mot de passe"
          >
            {showPassword ? <LuEyeOff /> : <LuEye />}
          </button>
        </div>
      </label>

      <label className="auth-field">
        <span>Confirmer le mot de passe</span>
        <div className="auth-field__input">
          <LuLock />
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
      </label>

      <button type="submit" className="auth-form__submit" disabled={loading}>
        {loading ? 'Création en cours...' : 'Activer mon compte'}
      </button>
    </form>
  );
}
