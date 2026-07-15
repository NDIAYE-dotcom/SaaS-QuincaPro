import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuLock } from 'react-icons/lu';
import { updatePassword } from '../../../services/authService';
import './ResetPassword.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate('/connexion', { replace: true }), 2000);
    } catch (err) {
      setError(
        err.message.toLowerCase().includes('session')
          ? 'Ce lien de réinitialisation est invalide ou expiré. Merci de refaire une demande.'
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="auth-form">
        <h1>Mot de passe mis à jour</h1>
        <p className="auth-form__subtitle">Redirection vers la connexion...</p>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Nouveau mot de passe</h1>
      <p className="auth-form__subtitle">Choisissez un nouveau mot de passe</p>

      {error && <div className="auth-form__error">{error}</div>}

      <label className="auth-field">
        <span>Nouveau mot de passe</span>
        <div className="auth-field__input">
          <LuLock />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
      </label>

      <label className="auth-field">
        <span>Confirmer le mot de passe</span>
        <div className="auth-field__input">
          <LuLock />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
      </label>

      <button type="submit" className="auth-form__submit" disabled={loading}>
        {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
      </button>
    </form>
  );
}
