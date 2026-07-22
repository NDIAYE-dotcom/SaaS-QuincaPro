import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LuLayoutDashboard,
  LuBuilding2,
  LuMegaphone,
  LuReceipt,
  LuMenu,
  LuX,
  LuSun,
  LuMoon,
  LuLogOut,
} from 'react-icons/lu';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/authService';
import './MainLayout.css';

export default function SuperAdminLayout() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { profile } = useAuth();
  const NAV_ITEMS = [
    { to: '/super-admin', labelKey: 'superAdmin.navDashboard', icon: LuLayoutDashboard, end: true },
    { to: '/super-admin/entreprises', labelKey: 'superAdmin.navCompanies', icon: LuBuilding2 },
    { to: '/super-admin/annonces', labelKey: 'superAdmin.navAnnouncements', icon: LuMegaphone },
    { to: '/super-admin/paydunya', labelKey: 'superAdmin.navPaydunya', icon: LuReceipt },
  ];
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/connexion', { replace: true });
  }

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <img src="/logo-icon-dark.png" alt="QuincaPro" className="sidebar__brand-mark" />
          <span className="sidebar__brand-name">QuincaPro Admin</span>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon className="sidebar__icon" />
              <span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {sidebarOpen && <div className="layout__overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="layout__main">
        <header className="topbar">
          <button
            className="topbar__icon-btn topbar__menu-btn"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={t('nav.openMenu')}
          >
            {sidebarOpen ? <LuX /> : <LuMenu />}
          </button>

          <div className="topbar__spacer" />

          <button
            className="topbar__icon-btn topbar__lang-btn"
            onClick={toggleLanguage}
            aria-label={t('nav.toggleLanguage')}
          >
            {language.toUpperCase()}
          </button>

          <button className="topbar__icon-btn" onClick={toggleTheme} aria-label={t('nav.toggleTheme')}>
            {theme === 'dark' ? <LuSun /> : <LuMoon />}
          </button>

          <div className="user-menu">
            <button className="user-menu__trigger" onClick={() => setUserMenuOpen((prev) => !prev)}>
              <span className="user-menu__avatar">
                {(profile?.nom_complet || '?').charAt(0).toUpperCase()}
              </span>
              <span className="user-menu__info">
                <span className="user-menu__name">{profile?.nom_complet}</span>
                <span className="user-menu__entreprise">{t('superAdmin.superAdminBrand')}</span>
              </span>
            </button>

            {userMenuOpen && (
              <>
                <div className="user-menu__overlay" onClick={() => setUserMenuOpen(false)} />
                <div className="user-menu__dropdown">
                  <button className="user-menu__signout" onClick={handleSignOut}>
                    <LuLogOut /> {t('nav.signOut')}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
