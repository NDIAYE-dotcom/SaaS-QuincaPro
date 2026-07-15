import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

export default function AuthLayout() {
  return (
    <div className="auth-layout">
      <aside className="auth-layout__brand">
        <div className="auth-layout__brand-content">
          <div className="auth-layout__logo">
            <span className="auth-layout__logo-mark">Q</span>
            <span>QuincaPro</span>
          </div>
          <h2>La gestion de votre quincaillerie, simplifiée.</h2>
          <p>
            Stock, ventes, achats et comptabilité réunis dans un seul outil pensé pour les commerces
            sénégalais.
          </p>
        </div>
      </aside>

      <main className="auth-layout__content">
        <div className="auth-layout__card">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
