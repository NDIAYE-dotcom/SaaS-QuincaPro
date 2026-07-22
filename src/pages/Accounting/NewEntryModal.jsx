import { useMemo, useState } from 'react';
import { LuX, LuPlus, LuTrash2, LuLoaderCircle } from 'react-icons/lu';
import { createEntry } from '../../services/accountingService';
import { useLanguage } from '../../contexts/LanguageContext';
import './NewEntryModal.css';

function emptyLigne() {
  return { compte_id: '', debit: '', credit: '' };
}

export default function NewEntryModal({ accounts, onClose, onSaved }) {
  const { t } = useLanguage();
  const [libelle, setLibelle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lignes, setLignes] = useState([emptyLigne(), emptyLigne()]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateLigne(index, field, value) {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function addLigne() {
    setLignes((prev) => [...prev, emptyLigne()]);
  }

  function removeLigne(index) {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  }

  const totals = useMemo(() => {
    const totalDebit = lignes.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
    const totalCredit = lignes.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
    return { totalDebit, totalCredit, equilibree: Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0 };
  }, [lignes]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!libelle.trim()) {
      setError(t('accounting.errorLabelRequired'));
      return;
    }
    if (lignes.some((l) => !l.compte_id)) {
      setError(t('accounting.errorSelectAccountEachLine'));
      return;
    }
    if (!totals.equilibree) {
      setError(t('accounting.errorMustBalance'));
      return;
    }

    setSaving(true);
    try {
      await createEntry({
        libelle: libelle.trim(),
        date,
        lignes: lignes.map((l) => ({
          compte_id: l.compte_id,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
        })),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{t('accounting.newEntryTitle')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <LuX />
          </button>
        </div>

        <form className="modal__body stacked-form" onSubmit={handleSubmit}>
          {error && <div className="page-error">{error}</div>}

          <div className="form-grid">
            <label className="field">
              <span>{t('accounting.fieldLabel')}</span>
              <input type="text" value={libelle} onChange={(e) => setLibelle(e.target.value)} required />
            </label>

            <label className="field">
              <span>{t('accounting.fieldDate')}</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>

          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('accounting.columnAccount')}</th>
                  <th>{t('accounting.columnDebit')}</th>
                  <th>{t('accounting.columnCredit')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        className="new-entry__select"
                        value={l.compte_id}
                        onChange={(e) => updateLigne(index, 'compte_id', e.target.value)}
                      >
                        <option value="">{t('accounting.select')}</option>
                        {accounts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.numero} — {c.nom}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="new-entry__cell-input"
                        value={l.debit}
                        onChange={(e) => updateLigne(index, 'debit', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="new-entry__cell-input"
                        value={l.credit}
                        onChange={(e) => updateLigne(index, 'credit', e.target.value)}
                      />
                    </td>
                    <td>
                      {lignes.length > 2 && (
                        <button
                          type="button"
                          className="icon-btn icon-btn--danger"
                          onClick={() => removeLigne(index)}
                          aria-label={t('accounting.remove')}
                        >
                          <LuTrash2 />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="data-table__title">{t('accounting.total')}</td>
                  <td className="data-table__title">{totals.totalDebit.toLocaleString('fr-FR')} FCFA</td>
                  <td className="data-table__title">{totals.totalCredit.toLocaleString('fr-FR')} FCFA</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button type="button" className="btn btn--ghost" onClick={addLigne}>
            <LuPlus /> {t('accounting.addLine')}
          </button>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving && <LuLoaderCircle className="spin" />}
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
