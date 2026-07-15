import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LuBuilding2, LuCircleCheck, LuCircleAlert, LuBan, LuCoins, LuTrendingUp } from 'react-icons/lu';
import { fetchEntrepriseStats, fetchRevenueStats } from '../../services/superAdminService';
import './SuperAdminDashboard.css';

function formatMoney(amount) {
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [entrepriseStats, revenueStats] = await Promise.all([
          fetchEntrepriseStats(),
          fetchRevenueStats(),
        ]);
        setStats(entrepriseStats);
        setRevenue(revenueStats);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = stats
    ? [
        { label: 'Entreprises inscrites', value: stats.total, icon: LuBuilding2 },
        { label: 'Abonnements actifs', value: stats.actif, icon: LuCircleCheck },
        { label: 'En attente de paiement', value: stats.en_attente_paiement, icon: LuCircleAlert },
        { label: 'Expirés / suspendus', value: stats.expire + stats.suspendu, icon: LuBan },
        { label: 'Revenu du mois', value: formatMoney(revenue?.moisEnCours || 0), icon: LuTrendingUp },
        { label: 'Revenu total', value: formatMoney(revenue?.total || 0), icon: LuCoins },
      ]
    : [];

  return (
    <div className="super-admin-dashboard">
      <div className="page-header">
        <div>
          <h1>Tableau de bord Super Admin</h1>
          <p>Vue d'ensemble des abonnements QuincaPro</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}
      {loading && <p className="page-loading">Chargement...</p>}

      {!loading && stats && (
        <div className="super-admin-dashboard__grid">
          {cards.map(({ label, value, icon: Icon }, index) => (
            <motion.div
              key={label}
              className="stat-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              <div className="stat-card__icon">
                <Icon />
              </div>
              <div>
                <p className="stat-card__label">{label}</p>
                <p className="stat-card__value">{value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
