import { useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { createDepense } from '../../services/depensesCaisseService';
import { useLanguage } from '../../contexts/LanguageContext';
import './DepenseFormModal.css';

const CATEGORIES_SUGGESTIONS = ['Repas', 'Transport', 'Fournitures', 'Entretien', 'Autre'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function DepenseFormModal({ onClose, onSaved }) {
  const { t } = useLanguage();
  const [dateDepense, setDateDepense] = useState(today());
  const [categorie, setCategorie] = useState('');
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!categorie.trim()) {
      setError(t('depenses.errorCategoryRequired'));
      return;
    }
    if (!(Number(montant) > 0)) {
      setError(t('depenses.errorAmountRequired'));
      return;
    }

    setSaving(true);
    try {
      const created = await createDepense({
        dateDepense,
        categorie: categorie.trim(),
        description: description.trim(),
        montant: Number(montant),
      });
      onSaved(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{t('depenses.newExpenseTitle')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <LuX />
          </button>
        </div>

        <form className="modal__body stacked-form" onSubmit={handleSubmit}>
          {error && <div className="page-error">{error}</div>}

          <label className="field">
            <span>{t('depenses.fieldDate')}</span>
            <input type="date" value={dateDepense} onChange={(e) => setDateDepense(e.target.value)} required />
          </label>

          <label className="field">
            <span>{t('depenses.fieldCategory')}</span>
            <input
              type="text"
              list="depenses-categories-suggestions"
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              placeholder={t('depenses.fieldCategoryPlaceholder')}
              required
            />
            <datalist id="depenses-categories-suggestions">
              {CATEGORIES_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>

          <label className="field">
            <span>{t('depenses.fieldAmount')}</span>
            <input type="number" min="0" step="1" value={montant} onChange={(e) => setMontant(e.target.value)} required />
          </label>

          <label className="field">
            <span>{t('depenses.fieldDescription')}</span>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>

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
