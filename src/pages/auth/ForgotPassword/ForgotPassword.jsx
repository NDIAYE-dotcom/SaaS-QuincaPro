import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuMail } from 'react-icons/lu';
import { requestPasswordReset } from '../../../services/authService';
import './ForgotPassword.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-form">
        <h1>Email envoyé</h1>
        <p className="auth-form__subtitle">
          Si un compte existe pour <strong>{email}</strong>, un lien de réinitialisation vient de lui
          être envoyé.
        </p>
        <Link to="/connexion" className="auth-form__link-inline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Mot de passe oublié</h1>
      <p className="auth-form__subtitle">Recevez un lien pour réinitialiser votre mot de passe</p>

      {error && <div className="auth-form__error">{error}</div>}

      <label className="auth-field">
        <span>Email</span>
        <div className="auth-field__input">
          <LuMail />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
      </label>

      <button type="submit" className="auth-form__submit" disabled={loading}>
        {loading ? 'Envoi...' : 'Envoyer le lien'}
      </button>

      <p className="auth-form__footer">
        <Link to="/connexion">Retour à la connexion</Link>
      </p>
    </form>
  );
}
