import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuPlus, LuSearch, LuBan } from 'react-icons/lu';
import { fetchDepenses, cancelDepense } from '../../services/depensesCaisseService';
import { useLanguage } from '../../contexts/LanguageContext';
import DepenseFormModal from './DepenseFormModal';
import './Depenses.css';

export default function Depenses() {
  const { t, language } = useLanguage();
  const [depenses, setDepenses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const loadDepenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchDepenses();
      setDepenses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepenses();
  }, [loadDepenses]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return depenses;
    return depenses.filter(
      (d) => d.categorie.toLowerCase().includes(term) || (d.description || '').toLowerCase().includes(term),
    );
  }, [depenses, search]);

  function handleSaved() {
    setFormOpen(false);
    loadDepenses();
  }

  async function handleCancel(depense) {
    const confirmMessage = t('depenses.confirmCancel', {
      amount: Number(depense.montant).toLocaleString('fr-FR'),
      category: depense.categorie,
    });
    if (!window.confirm(confirmMessage)) return;
    try {
      const updated = await cancelDepense(depense.id);
      setDepenses((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="depenses">
      <div className="page-header">
        <div>
          <h1>{t('depenses.title')}</h1>
          <p>{t('depenses.subtitle')}</p>
        </div>
        <button className="btn btn--primary" onClick={() => setFormOpen(true)}>
          <LuPlus /> {t('depenses.newExpense')}
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <LuSearch />
          <input
            type="text"
            placeholder={t('depenses.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="page-empty">
          <p>{t('depenses.noExpensesYet')}</p>
          <button className="btn btn--primary" onClick={() => setFormOpen(true)}>
            <LuPlus /> {t('depenses.addFirstExpense')}
          </button>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('depenses.columnDate')}</th>
                <th>{t('depenses.columnCategory')}</th>
                <th>{t('depenses.columnDescription')}</th>
                <th>{t('depenses.columnAmount')}</th>
                <th>{t('depenses.columnCreatedBy')}</th>
                <th>{t('depenses.columnStatus')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((depense) => (
                <tr key={depense.id}>
                  <td>{new Date(depense.date_depense).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}</td>
                  <td className="data-table__title">{depense.categorie}</td>
                  <td>{depense.description || '—'}</td>
                  <td>{Number(depense.montant).toLocaleString('fr-FR')} FCFA</td>
                  <td>{depense.cree_par?.nom_complet || t('depenses.system')}</td>
                  <td>
                    <span className={`badge ${depense.annulee ? 'badge--danger' : 'badge--success'}`}>
                      {depense.annulee ? t('depenses.statusCancelled') : t('depenses.statusActive')}
                    </span>
                  </td>
                  <td className="data-table__actions">
                    {!depense.annulee && (
                      <button
                        className="icon-btn icon-btn--danger"
                        title={t('depenses.cancel')}
                        onClick={() => handleCancel(depense)}
                      >
                        <LuBan />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && <DepenseFormModal onClose={() => setFormOpen(false)} onSaved={handleSaved} />}
    </div>
  );
}
