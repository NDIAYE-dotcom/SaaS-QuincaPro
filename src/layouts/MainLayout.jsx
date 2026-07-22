import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LuLayoutDashboard,
  LuPackage,
  LuWarehouse,
  LuShoppingCart,
  LuUsers,
  LuTruck,
  LuCalculator,
  LuSettings,
  LuMenu,
  LuX,
  LuSun,
  LuMoon,
  LuLogOut,
  LuHandshake,
  LuUserCog,
  LuChartColumn,
  LuHistory,
} from 'react-icons/lu';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/authService';
import AnnouncementBanner from '../shared/AnnouncementBanner';
import SubscriptionExpiryBanner from '../shared/SubscriptionExpiryBanner';
import NotificationsMenu from '../shared/NotificationsMenu';
import './MainLayout.css';

const NAV_ITEMS = [
  { to: '/tableau-de-bord', labelKey: 'nav.dashboard', icon: LuLayoutDashboard, end: true },
  { to: '/produits', labelKey: 'nav.products', icon: LuPackage },
  { to: '/stock', labelKey: 'nav.stock', icon: LuWarehouse },
  { to: '/ventes', labelKey: 'nav.sales', icon: LuShoppingCart },
  { to: '/achats', labelKey: 'nav.purchases', icon: LuTruck },
  { to: '/clients', labelKey: 'nav.clients', icon: LuUsers },
  { to: '/fournisseurs', labelKey: 'nav.suppliers', icon: LuHandshake },
  { to: '/comptabilite', labelKey: 'nav.accounting', icon: LuCalculator },
  { to: '/rapports', labelKey: 'nav.reports', icon: LuChartColumn },
  { to: '/equipe', labelKey: 'nav.team', icon: LuUserCog, adminOnly: true },
  { to: '/journal-activite', labelKey: 'nav.activityLog', icon: LuHistory, adminOnly: true },
  { to: '/parametres', labelKey: 'nav.settings', icon: LuSettings },
];

export default function MainLayout() {
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { profile, entreprise } = useAuth();
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
          {entreprise?.logo_url && (
            <img src={entreprise.logo_url} alt={entreprise.nom} className="sidebar__brand-mark" />
          )}
          <span className="sidebar__brand-name">{entreprise?.nom}</span>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.filter((item) => !item.adminOnly || profile?.role === 'admin').map(
            ({ to, labelKey, icon: Icon, end }) => (
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
            ),
          )}
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

          <NotificationsMenu />

          <button
            className="topbar__icon-btn topbar__lang-btn"
            onClick={toggleLanguage}
            aria-label={t('nav.toggleLanguage')}
          >
            {language.toUpperCase()}
          </button>

          <button
            className="topbar__icon-btn"
            onClick={toggleTheme}
            aria-label={t('nav.toggleTheme')}
          >
            {theme === 'dark' ? <LuSun /> : <LuMoon />}
          </button>

          <div className="user-menu">
            <button
              className="user-menu__trigger"
              onClick={() => setUserMenuOpen((prev) => !prev)}
            >
              {entreprise?.logo_url ? (
                <img src={entreprise.logo_url} alt={entreprise.nom} className="user-menu__avatar user-menu__avatar--logo" />
              ) : (
                <span className="user-menu__avatar">
                  {(profile?.nom_complet || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="user-menu__info">
                <span className="user-menu__name">{profile?.nom_complet}</span>
                <span className="user-menu__entreprise">{entreprise?.nom}</span>
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
          <SubscriptionExpiryBanner />
          <AnnouncementBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
