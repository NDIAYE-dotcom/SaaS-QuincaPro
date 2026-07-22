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
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { fetchDashboardData } from '../../services/dashboardService';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

function formatMoney(amount) {
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`;
}

export default function Dashboard() {
  const { entreprise } = useAuth();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const PAIEMENT_LABELS = {
    impaye: t('dashboard.paymentUnpaid'),
    partiel: t('dashboard.paymentPartial'),
    paye: t('dashboard.paymentPaid'),
  };

  const statCards = data
    ? [
        { label: t('dashboard.statRevenueMonth'), value: formatMoney(data.caMois), icon: LuTrendingUp },
        { label: t('dashboard.statSalesToday'), value: data.ventesJour, icon: LuShoppingCart },
        { label: t('dashboard.statPurchasesMonth'), value: formatMoney(data.achatsMois), icon: LuTruck },
        { label: t('dashboard.statUnpaidInvoices'), value: data.ventesImpayees, icon: LuFileWarning },
        { label: t('dashboard.statOutOfStock'), value: data.produitsRupture, icon: LuPackageX },
        { label: t('dashboard.statLowStock'), value: data.produitsStockFaible, icon: LuTriangleAlert },
        { label: t('dashboard.statClientDebts'), value: formatMoney(data.dettesClients), icon: LuUsers },
        {
          label: t('dashboard.statSupplierDebts'),
          value: formatMoney(data.dettesFournisseurs),
          icon: LuHandshake,
        },
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
        borderColor: '#2f9bb3',
        backgroundColor: 'rgba(47, 155, 179, 0.12)',
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
        {entreprise?.logo_url && (
          <img src={entreprise.logo_url} alt={entreprise.nom} className="dashboard__logo" />
        )}
        <div>
          <h1>{entreprise?.nom || t('dashboard.title')}</h1>
          <p>{t('dashboard.subtitle')}</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}
      {loading && <p className="page-loading">{t('common.loading')}</p>}

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
              <h2 className="section-title">{t('dashboard.salesEvolution')}</h2>
              <div className="dashboard__chart-wrap">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            <div className="dashboard__card">
              <h2 className="section-title">{t('dashboard.topProducts')}</h2>
              {data.topProduits.length === 0 ? (
                <p className="page-empty">{t('dashboard.noSalesThisMonth')}</p>
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
            <h2 className="section-title">{t('dashboard.recentActivity')}</h2>
            {data.recentes.length === 0 ? (
              <p className="page-empty">{t('dashboard.noSalesYet')}</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('dashboard.columnInvoice')}</th>
                      <th>{t('dashboard.columnClient')}</th>
                      <th>{t('dashboard.columnAmount')}</th>
                      <th>{t('dashboard.columnPayment')}</th>
                      <th>{t('dashboard.columnDate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentes.map((v) => (
                      <tr key={v.id}>
                        <td className="data-table__title">{v.numero}</td>
                        <td>{v.client?.nom || t('dashboard.walkInClient')}</td>
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
