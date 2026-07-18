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
  LuBell,
  LuLogOut,
  LuHandshake,
  LuUserCog,
  LuChartColumn,
} from 'react-icons/lu';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/authService';
import AnnouncementBanner from '../shared/AnnouncementBanner';
import './MainLayout.css';

const NAV_ITEMS = [
  { to: '/tableau-de-bord', label: 'Tableau de bord', icon: LuLayoutDashboard, end: true },
  { to: '/produits', label: 'Produits', icon: LuPackage },
  { to: '/stock', label: 'Stock', icon: LuWarehouse },
  { to: '/ventes', label: 'Ventes', icon: LuShoppingCart },
  { to: '/achats', label: 'Achats', icon: LuTruck },
  { to: '/clients', label: 'Clients', icon: LuUsers },
  { to: '/fournisseurs', label: 'Fournisseurs', icon: LuHandshake },
  { to: '/comptabilite', label: 'Comptabilité', icon: LuCalculator },
  { to: '/rapports', label: 'Rapports', icon: LuChartColumn },
  { to: '/equipe', label: 'Équipe', icon: LuUserCog, adminOnly: true },
  { to: '/parametres', label: 'Paramètres', icon: LuSettings },
];

export default function MainLayout() {
  const { theme, toggleTheme } = useTheme();
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
            ({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="sidebar__icon" />
                <span>{label}</span>
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
            aria-label="Ouvrir le menu"
          >
            {sidebarOpen ? <LuX /> : <LuMenu />}
          </button>

          <div className="topbar__spacer" />

          <button className="topbar__icon-btn" aria-label="Notifications">
            <LuBell />
          </button>

          <button
            className="topbar__icon-btn"
            onClick={toggleTheme}
            aria-label="Basculer le thème"
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
                    <LuLogOut /> Se déconnecter
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="layout__content">
          <AnnouncementBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
