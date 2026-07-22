import { useEffect, useState } from 'react';
import { LuX } from 'react-icons/lu';
import { fetchPaymentHistory } from '../../services/superAdminService';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PaymentHistoryModal({ entreprise, onClose }) {
  const { t } = useLanguage();
  const METHODE_LABELS = t('common.paymentMethods');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPaymentHistory(entreprise.id);
        setPayments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [entreprise.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>
            {t('superAdmin.historyTitlePrefix')} {entreprise.nom}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <LuX />
          </button>
        </div>

        <div className="modal__body">
          {error && <div className="page-error">{error}</div>}
          {loading && <p className="page-loading">{t('common.loading')}</p>}

          {!loading && payments.length === 0 && (
            <p className="page-empty">{t('superAdmin.noPaymentsRecorded')}</p>
          )}

          {!loading && payments.length > 0 && (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('superAdmin.columnDate')}</th>
                    <th>{t('superAdmin.columnAmount')}</th>
                    <th>{t('superAdmin.columnMethod')}</th>
                    <th>{t('superAdmin.columnPeriodCovered')}</th>
                    <th>{t('superAdmin.columnNotes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>{Number(p.montant).toLocaleString('fr-FR')} FCFA</td>
                      <td>{METHODE_LABELS[p.methode] || p.methode}</td>
                      <td>
                        {new Date(p.periode_debut).toLocaleDateString('fr-FR')} →{' '}
                        {new Date(p.periode_fin).toLocaleDateString('fr-FR')}
                      </td>
                      <td>{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
