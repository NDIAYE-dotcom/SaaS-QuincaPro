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
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/authService';
import './MainLayout.css';

const NAV_ITEMS = [
  { to: '/super-admin', label: 'Tableau de bord', icon: LuLayoutDashboard, end: true },
  { to: '/super-admin/entreprises', label: 'Entreprises', icon: LuBuilding2 },
  { to: '/super-admin/annonces', label: 'Annonces', icon: LuMegaphone },
  { to: '/super-admin/paydunya', label: 'Paiements PayDunya', icon: LuReceipt },
];

export default function SuperAdminLayout() {
  const { theme, toggleTheme } = useTheme();
  const { profile } = useAuth();
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
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
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
          ))}
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

          <button className="topbar__icon-btn" onClick={toggleTheme} aria-label="Basculer le thème">
            {theme === 'dark' ? <LuSun /> : <LuMoon />}
          </button>

          <div className="user-menu">
            <button className="user-menu__trigger" onClick={() => setUserMenuOpen((prev) => !prev)}>
              <span className="user-menu__avatar">
                {(profile?.nom_complet || '?').charAt(0).toUpperCase()}
              </span>
              <span className="user-menu__info">
                <span className="user-menu__name">{profile?.nom_complet}</span>
                <span className="user-menu__entreprise">Super Admin</span>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}
