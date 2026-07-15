import { motion } from 'framer-motion';
import { LuTrendingUp, LuPackage, LuTriangleAlert, LuUsers } from 'react-icons/lu';
import './Dashboard.css';

const STAT_CARDS = [
  { label: "Chiffre d'affaires du mois", value: '0 FCFA', icon: LuTrendingUp },
  { label: 'Ventes du jour', value: '0', icon: LuPackage },
  { label: 'Produits en rupture', value: '0', icon: LuTriangleAlert },
  { label: 'Clients actifs', value: '0', icon: LuUsers },
];

export default function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1>Tableau de bord</h1>
        <p>Vue d'ensemble de votre quincaillerie</p>
      </div>

      <div className="dashboard__grid">
        {STAT_CARDS.map(({ label, value, icon: Icon }, index) => (
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

      <div className="dashboard__placeholder">
        <p>Les graphiques de ventes, le top produits et les alertes de stock arriveront dans une prochaine étape.</p>
      </div>
    </div>
  );
}
