import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuPlus, LuEye } from 'react-icons/lu';
import { fetchSales } from '../../services/salesService';
import { useLanguage } from '../../contexts/LanguageContext';
import './Sales.css';

const STATUT_BADGE = {
  devis: 'badge--warning',
  commande: 'badge--warning',
  facture: 'badge--success',
  annulee: 'badge--danger',
};
const PAIEMENT_BADGE = { impaye: 'badge--danger', partiel: 'badge--warning', paye: 'badge--success' };

export default function Sales() {
  const { t } = useLanguage();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const STATUT_LABELS = {
    devis: t('sales.statutDevis'),
    commande: t('sales.statutCommande'),
    facture: t('sales.statutFacture'),
    annulee: t('sales.statutAnnulee'),
  };
  const PAIEMENT_LABELS = {
    impaye: t('common.paymentUnpaid'),
    partiel: t('common.paymentPartial'),
    paye: t('common.paymentPaid'),
  };

  const loadSales = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSales();
      setSales(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  return (
    <div className="sales">
      <div className="page-header">
        <div>
          <h1>{t('sales.title')}</h1>
          <p>{t('sales.subtitle')}</p>
        </div>
        <Link to="/ventes/nouvelle" className="btn btn--primary">
          <LuPlus /> {t('sales.newSale')}
        </Link>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">{t('common.loading')}</p>
      ) : sales.length === 0 ? (
        <div className="page-empty">
          <p>{t('sales.noSalesYet')}</p>
          <Link to="/ventes/nouvelle" className="btn btn--primary">
            <LuPlus /> {t('sales.createFirstSale')}
          </Link>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('sales.columnNumber')}</th>
                <th>{t('sales.columnClient')}</th>
                <th>{t('sales.columnStatus')}</th>
                <th>{t('sales.columnPayment')}</th>
                <th>{t('sales.columnTotal')}</th>
                <th>{t('sales.columnDate')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="data-table__title">{sale.numero}</td>
                  <td>{sale.client?.nom || sale.client_nom_libre || t('sales.walkInClient')}</td>
                  <td>
                    <span className={`badge ${STATUT_BADGE[sale.statut]}`}>{STATUT_LABELS[sale.statut]}</span>
                  </td>
                  <td>
                    {sale.statut === 'facture' && (
                      <span className={`badge ${PAIEMENT_BADGE[sale.statut_paiement]}`}>
                        {PAIEMENT_LABELS[sale.statut_paiement]}
                      </span>
                    )}
                  </td>
                  <td>{Number(sale.total_ttc).toLocaleString('fr-FR')} FCFA</td>
                  <td>{new Date(sale.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="data-table__actions">
                    <Link to={`/ventes/${sale.id}`} className="icon-btn" aria-label={t('sales.view')}>
                      <LuEye />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
