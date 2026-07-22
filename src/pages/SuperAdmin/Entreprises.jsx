import { useCallback, useEffect, useState } from 'react';
import { LuSearch, LuHistory, LuBan, LuRefreshCw } from 'react-icons/lu';
import { fetchEntreprises, setSubscriptionStatus } from '../../services/superAdminService';
import { useLanguage } from '../../contexts/LanguageContext';
import ActivateSubscriptionModal from './ActivateSubscriptionModal';
import PaymentHistoryModal from './PaymentHistoryModal';
import './Entreprises.css';

const STATUT_BADGE = {
  en_attente_paiement: 'badge--warning',
  actif: 'badge--success',
  expire: 'badge--danger',
  suspendu: 'badge--danger',
};

export default function Entreprises() {
  const { t } = useLanguage();
  const STATUT_LABELS = {
    en_attente_paiement: t('superAdmin.statutPending'),
    actif: t('superAdmin.statutActive'),
    expire: t('superAdmin.statutExpired'),
    suspendu: t('superAdmin.statutSuspended'),
  };
  const [entreprises, setEntreprises] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activating, setActivating] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadEntreprises = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEntreprises(search);
      setEntreprises(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(loadEntreprises, 300);
    return () => clearTimeout(timeout);
  }, [loadEntreprises]);

  async function handleSuspend(entreprise) {
    if (!window.confirm(t('superAdmin.confirmSuspend', { name: entreprise.nom }))) return;
    setBusyId(entreprise.id);
    try {
      await setSubscriptionStatus(entreprise.id, 'suspendu');
      await loadEntreprises();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="super-admin-entreprises">
      <div className="page-header">
        <div>
          <h1>{t('superAdmin.companiesTitle')}</h1>
          <p>{t('superAdmin.companiesSubtitle')}</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="toolbar">
        <div className="search-box">
          <LuSearch />
          <input
            type="text"
            placeholder={t('superAdmin.searchCompanyPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && <p className="page-loading">{t('common.loading')}</p>}

      {!loading && entreprises.length === 0 && (
        <p className="page-empty">{t('superAdmin.noCompaniesFound')}</p>
      )}

      {!loading && entreprises.length > 0 && (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('superAdmin.columnCompany')}</th>
                <th>{t('superAdmin.columnStatus')}</th>
                <th>{t('superAdmin.columnExpiration')}</th>
                <th>{t('superAdmin.columnMembers')}</th>
                <th>{t('superAdmin.columnRegisteredOn')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entreprises.map((e) => (
                <tr key={e.id}>
                  <td className="data-table__title">
                    {e.nom}
                    {e.email && <div className="data-table__subtitle">{e.email}</div>}
                  </td>
                  <td>
                    <span className={`badge ${STATUT_BADGE[e.statut_abonnement]}`}>
                      {STATUT_LABELS[e.statut_abonnement]}
                    </span>
                  </td>
                  <td>
                    {e.date_expiration_abonnement
                      ? new Date(e.date_expiration_abonnement).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td>{e.profiles?.[0]?.count ?? 0}</td>
                  <td>{new Date(e.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="data-table__actions">
                    <button
                      className="icon-btn"
                      title={t('superAdmin.paymentHistory')}
                      onClick={() => setViewingHistory(e)}
                    >
                      <LuHistory />
                    </button>
                    {e.statut_abonnement === 'actif' ? (
                      <>
                        <button
                          className="icon-btn"
                          title={t('superAdmin.renew')}
                          onClick={() => setActivating(e)}
                        >
                          <LuRefreshCw />
                        </button>
                        <button
                          className="icon-btn icon-btn--danger"
                          title={t('superAdmin.suspend')}
                          disabled={busyId === e.id}
                          onClick={() => handleSuspend(e)}
                        >
                          <LuBan />
                        </button>
                      </>
                    ) : (
                      <button className="btn btn--primary" onClick={() => setActivating(e)}>
                        {t('superAdmin.activate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activating && (
        <ActivateSubscriptionModal
          entreprise={activating}
          onClose={() => setActivating(null)}
          onSaved={() => {
            setActivating(null);
            loadEntreprises();
          }}
        />
      )}

      {viewingHistory && (
        <PaymentHistoryModal entreprise={viewingHistory} onClose={() => setViewingHistory(null)} />
      )}
    </div>
  );
}
