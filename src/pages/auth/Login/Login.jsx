import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LuMail, LuLock, LuEye, LuEyeOff } from 'react-icons/lu';
import { signIn } from '../../../services/authService';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/tableau-de-bord';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect'
          : err.message,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Connexion</h1>
      <p className="auth-form__subtitle">Accédez à votre espace de gestion</p>

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
            placeholder="vous@quincaillerie.sn"
          />
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
            autoComplete="current-password"
            placeholder="••••••••"
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

      <Link to="/mot-de-passe-oublie" className="auth-form__link-inline">
        Mot de passe oublié ?
      </Link>

      <button type="submit" className="auth-form__submit" disabled={loading}>
        {loading ? 'Connexion...' : 'Se connecter'}
      </button>

      <p className="auth-form__footer">
        Pas encore de compte ? <Link to="/inscription">Créer mon entreprise</Link>
      </p>
    </form>
  );
}
