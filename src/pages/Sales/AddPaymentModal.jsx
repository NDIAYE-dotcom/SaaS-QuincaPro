import { useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { addPayment } from '../../services/salesService';
import { useLanguage } from '../../contexts/LanguageContext';
import './AddPaymentModal.css';

const MOYEN_VALUES = ['especes', 'wave', 'orange_money', 'free_money', 'carte', 'virement', 'cheque'];

export default function AddPaymentModal({ sale, onClose, onSaved }) {
  const { t } = useLanguage();
  const paymentMethods = t('common.paymentMethods');
  const reste = sale.total_ttc - sale.montant_paye;
  const [montant, setMontant] = useState(String(reste));
  const [moyenPaiement, setMoyenPaiement] = useState('especes');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const amount = Number(montant);
    if (!amount || amount <= 0) {
      setError(t('sales.errorPositiveAmount'));
      return;
    }

    setSaving(true);
    try {
      await addPayment({ venteId: sale.id, montant: amount, moyenPaiement, notes: notes.trim() || null });
      onSaved();
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
          <h2>{t('sales.addPaymentTitle')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <LuX />
          </button>
        </div>

        <form className="modal__body stacked-form" onSubmit={handleSubmit}>
          {error && <div className="page-error">{error}</div>}

          <label className="field">
            <span>{t('sales.amountLabel')}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
            />
            <small className="field__hint">
              {t('sales.remainingHint', { amount: reste.toLocaleString('fr-FR') })}
            </small>
          </label>

          <label className="field">
            <span>{t('sales.paymentMethodLabel')}</span>
            <select value={moyenPaiement} onChange={(e) => setMoyenPaiement(e.target.value)}>
              {MOYEN_VALUES.map((value) => (
                <option key={value} value={value}>
                  {paymentMethods[value]}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t('sales.columnNotes')}</span>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
