import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LuMail, LuLock, LuEye, LuEyeOff, LuUser, LuPhone, LuBuilding2 } from 'react-icons/lu';
import { signUp, registerEntreprise } from '../../../services/authService';
import './Register.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nomEntreprise: '',
    nomComplet: '',
    telephone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    setLoading(true);
    try {
      const { session } = await signUp({
        email: form.email,
        password: form.password,
        metadata: {
          nom_entreprise: form.nomEntreprise,
          nom_complet: form.nomComplet,
          telephone: form.telephone || null,
        },
      });

      if (session) {
        await registerEntreprise({
          nom: form.nomEntreprise,
          nomComplet: form.nomComplet,
          telephone: form.telephone,
        });
        navigate('/', { replace: true });
      } else {
        setEmailSent(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (emailSent) {
    return (
      <div className="auth-form">
        <h1>Vérifiez votre email</h1>
        <p className="auth-form__subtitle">
          Un lien de confirmation a été envoyé à <strong>{form.email}</strong>. Cliquez dessus pour
          activer votre compte et finaliser la création de votre entreprise.
        </p>
        <Link to="/connexion" className="auth-form__link-inline">
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>Créer votre entreprise</h1>
      <p className="auth-form__subtitle">Démarrez avec QuincaPro en quelques minutes</p>

      {error && <div className="auth-form__error">{error}</div>}

      <label className="auth-field">
        <span>Nom de la quincaillerie</span>
        <div className="auth-field__input">
          <LuBuilding2 />
          <input
            type="text"
            value={form.nomEntreprise}
            onChange={update('nomEntreprise')}
            required
            placeholder="Quincaillerie Diop & Fils"
          />
        </div>
      </label>

      <label className="auth-field">
        <span>Votre nom complet</span>
        <div className="auth-field__input">
          <LuUser />
          <input
            type="text"
            value={form.nomComplet}
            onChange={update('nomComplet')}
            required
            placeholder="Ousmane Ndiaye"
          />
        </div>
      </label>

      <label className="auth-field">
        <span>Téléphone (optionnel)</span>
        <div className="auth-field__input">
          <LuPhone />
          <input
            type="tel"
            value={form.telephone}
            onChange={update('telephone')}
            placeholder="77 123 45 67"
          />
        </div>
      </label>

      <label className="auth-field">
        <span>Email</span>
        <div className="auth-field__input">
          <LuMail />
          <input
            type="email"
            value={form.email}
            onChange={update('email')}
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
            value={form.password}
            onChange={update('password')}
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
            value={form.confirmPassword}
            onChange={update('confirmPassword')}
            required
            autoComplete="new-password"
          />
        </div>
      </label>

      <button type="submit" className="auth-form__submit" disabled={loading}>
        {loading ? 'Création en cours...' : 'Créer mon compte'}
      </button>

      <p className="auth-form__footer">
        Déjà un compte ? <Link to="/connexion">Se connecter</Link>
      </p>
    </form>
  );
}
