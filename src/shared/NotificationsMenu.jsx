import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuBell, LuPackageX, LuTriangleAlert } from 'react-icons/lu';
import { fetchLowStockAlerts } from '../services/alertsService';
import './NotificationsMenu.css';

export default function NotificationsMenu() {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchLowStockAlerts()
      .then(setAlerts)
      .catch(() => {});
  }, []);

  return (
    <div className="notifications-menu">
      <button
        className="topbar__icon-btn notifications-menu__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <LuBell />
        {alerts.length > 0 && <span className="notifications-menu__badge">{alerts.length}</span>}
      </button>

      {open && (
        <>
          <div className="user-menu__overlay" onClick={() => setOpen(false)} />
          <div className="notifications-menu__dropdown">
            <p className="notifications-menu__title">Alertes stock</p>

            {alerts.length === 0 ? (
              <p className="notifications-menu__empty">Aucune alerte pour le moment.</p>
            ) : (
              <ul className="notifications-menu__list">
                {alerts.slice(0, 8).map((p) => (
                  <li key={p.id} className="notifications-menu__item">
                    {Number(p.quantite_stock) <= 0 ? (
                      <LuPackageX className="notifications-menu__icon notifications-menu__icon--danger" />
                    ) : (
                      <LuTriangleAlert className="notifications-menu__icon notifications-menu__icon--warning" />
                    )}
                    <span className="notifications-menu__item-name">{p.nom}</span>
                    <span className="notifications-menu__item-qty">
                      {p.quantite_stock} {p.unite}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <Link to="/stock" className="notifications-menu__link" onClick={() => setOpen(false)}>
              Voir le stock
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
