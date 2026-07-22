import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuPlus, LuEye } from 'react-icons/lu';
import { fetchPurchases } from '../../services/purchasesService';
import { useLanguage } from '../../contexts/LanguageContext';
import './Purchases.css';

const STATUT_BADGE = { commande: 'badge--warning', recu: 'badge--success', annule: 'badge--danger' };
const PAIEMENT_BADGE = { impaye: 'badge--danger', partiel: 'badge--warning', paye: 'badge--success' };

export default function Purchases() {
  const { t } = useLanguage();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const STATUT_LABELS = {
    commande: t('purchases.statutCommande'),
    recu: t('purchases.statutRecu'),
    annule: t('purchases.statutAnnule'),
  };
  const PAIEMENT_LABELS = {
    impaye: t('common.paymentUnpaid'),
    partiel: t('common.paymentPartial'),
    paye: t('common.paymentPaid'),
  };

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPurchases();
      setPurchases(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  return (
    <div className="purchases">
      <div className="page-header">
        <div>
          <h1>{t('purchases.title')}</h1>
          <p>{t('purchases.subtitle')}</p>
        </div>
        <Link to="/achats/nouveau" className="btn btn--primary">
          <LuPlus /> {t('purchases.newPurchase')}
        </Link>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">{t('common.loading')}</p>
      ) : purchases.length === 0 ? (
        <div className="page-empty">
          <p>{t('purchases.noPurchasesYet')}</p>
          <Link to="/achats/nouveau" className="btn btn--primary">
            <LuPlus /> {t('purchases.createFirstPurchase')}
          </Link>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('purchases.columnNumber')}</th>
                <th>{t('purchases.columnSupplier')}</th>
                <th>{t('purchases.columnStatus')}</th>
                <th>{t('purchases.columnPayment')}</th>
                <th>{t('purchases.columnTotal')}</th>
                <th>{t('purchases.columnDate')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((achat) => (
                <tr key={achat.id}>
                  <td className="data-table__title">{achat.numero}</td>
                  <td>{achat.fournisseur?.nom || '—'}</td>
                  <td>
                    <span className={`badge ${STATUT_BADGE[achat.statut]}`}>{STATUT_LABELS[achat.statut]}</span>
                  </td>
                  <td>
                    {achat.statut === 'recu' && (
                      <span className={`badge ${PAIEMENT_BADGE[achat.statut_paiement]}`}>
                        {PAIEMENT_LABELS[achat.statut_paiement]}
                      </span>
                    )}
                  </td>
                  <td>{Number(achat.total_ttc).toLocaleString('fr-FR')} FCFA</td>
                  <td>{new Date(achat.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="data-table__actions">
                    <Link to={`/achats/${achat.id}`} className="icon-btn" aria-label={t('purchases.view')}>
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
