import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LuLayoutDashboard,
  LuPackage,
  LuWarehouse,
  LuShoppingCart,
  LuUsers,
  LuTruck,
  LuFileText,
  LuCalculator,
  LuSettings,
  LuMenu,
  LuX,
  LuSun,
  LuMoon,
  LuBell,
} from 'react-icons/lu';
import { useTheme } from '../contexts/ThemeContext';
import './MainLayout.css';

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', icon: LuLayoutDashboard, end: true },
  { to: '/produits', label: 'Produits', icon: LuPackage },
  { to: '/stock', label: 'Stock', icon: LuWarehouse },
  { to: '/ventes', label: 'Ventes', icon: LuShoppingCart },
  { to: '/achats', label: 'Achats', icon: LuTruck },
  { to: '/clients', label: 'Clients', icon: LuUsers },
  { to: '/factures', label: 'Factures', icon: LuFileText },
  { to: '/comptabilite', label: 'Comptabilité', icon: LuCalculator },
  { to: '/parametres', label: 'Paramètres', icon: LuSettings },
];

export default function MainLayout() {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <span className="sidebar__brand-mark">Q</span>
          <span className="sidebar__brand-name">QuincaPro</span>
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
        </header>

        <main className="layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
