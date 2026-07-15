import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  LuTrendingUp,
  LuShoppingCart,
  LuTriangleAlert,
  LuPackageX,
  LuUsers,
  LuHandshake,
  LuFileWarning,
  LuTruck,
} from 'react-icons/lu';
import { fetchDashboardData } from '../../services/dashboardService';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const PAIEMENT_LABELS = { impaye: 'Impayé', partiel: 'Partiel', paye: 'Payé' };

function formatMoney(amount) {
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const statCards = data
    ? [
        { label: "Chiffre d'affaires du mois", value: formatMoney(data.caMois), icon: LuTrendingUp },
        { label: 'Ventes du jour', value: data.ventesJour, icon: LuShoppingCart },
        { label: 'Achats du mois', value: formatMoney(data.achatsMois), icon: LuTruck },
        { label: 'Factures impayées', value: data.ventesImpayees, icon: LuFileWarning },
        { label: 'Produits en rupture', value: data.produitsRupture, icon: LuPackageX },
        { label: 'Stock faible', value: data.produitsStockFaible, icon: LuTriangleAlert },
        { label: 'Dettes clients', value: formatMoney(data.dettesClients), icon: LuUsers },
        { label: 'Dettes fournisseurs', value: formatMoney(data.dettesFournisseurs), icon: LuHandshake },
      ]
    : [];

  const chartData = data && {
    labels: data.chart.labels.map((d) =>
      new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    ),
    datasets: [
      {
        label: 'Ventes (FCFA)',
        data: data.chart.data,
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { ticks: { callback: (v) => `${Number(v).toLocaleString('fr-FR')}` } },
    },
  };

  return (
    <div className="dashboard">
      <div className="dashboard__header">
        <h1>Tableau de bord</h1>
        <p>Vue d'ensemble de votre quincaillerie</p>
      </div>

      {error && <div className="page-error">{error}</div>}
      {loading && <p className="page-loading">Chargement...</p>}

      {!loading && data && (
        <>
          <div className="dashboard__grid">
            {statCards.map(({ label, value, icon: Icon }, index) => (
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

          <div className="dashboard__row">
            <div className="dashboard__card dashboard__card--chart">
              <h2 className="section-title">Évolution des ventes (14 derniers jours)</h2>
              <div className="dashboard__chart-wrap">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            <div className="dashboard__card">
              <h2 className="section-title">Top produits (ce mois)</h2>
              {data.topProduits.length === 0 ? (
                <p className="page-empty">Aucune vente ce mois-ci.</p>
              ) : (
                <ul className="dashboard__top-list">
                  {data.topProduits.map((p) => (
                    <li key={p.nom}>
                      <span>{p.nom}</span>
                      <span className="dashboard__top-value">{p.quantite}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="dashboard__card">
            <h2 className="section-title">Activités récentes</h2>
            {data.recentes.length === 0 ? (
              <p className="page-empty">Aucune vente pour le moment.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Facture</th>
                      <th>Client</th>
                      <th>Montant</th>
                      <th>Paiement</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentes.map((v) => (
                      <tr key={v.id}>
                        <td className="data-table__title">{v.numero}</td>
                        <td>{v.client?.nom || 'Client comptoir'}</td>
                        <td>{formatMoney(v.total_ttc)}</td>
                        <td>{PAIEMENT_LABELS[v.statut_paiement]}</td>
                        <td>{new Date(v.created_at).toLocaleDateString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
