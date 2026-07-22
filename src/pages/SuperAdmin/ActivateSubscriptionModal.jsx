import { useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { activateSubscription } from '../../services/superAdminService';
import { useLanguage } from '../../contexts/LanguageContext';

const METHODE_VALUES = ['wave', 'orange_money', 'free_money', 'carte', 'virement', 'especes', 'cheque'];

export default function ActivateSubscriptionModal({ entreprise, onClose, onSaved }) {
  const { t } = useLanguage();
  const paymentMethods = t('common.paymentMethods');
  const [montant, setMontant] = useState('5500');
  const [methode, setMethode] = useState('wave');
  const [dureeMois, setDureeMois] = useState('1');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const montantNum = Number(montant);
    const dureeNum = Number(dureeMois);
    if (!montantNum || montantNum <= 0) {
      setError(t('superAdmin.errorPositiveAmount'));
      return;
    }
    if (!dureeNum || dureeNum < 1) {
      setError(t('superAdmin.errorMinDuration'));
      return;
    }

    setSaving(true);
    try {
      await activateSubscription({
        entrepriseId: entreprise.id,
        montant: montantNum,
        methode,
        dureeMois: dureeNum,
        notes: notes.trim(),
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
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{t('superAdmin.activateSubscriptionTitle')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <LuX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body stacked-form">
            <p className="field__hint">
              {t('superAdmin.company')} <strong>{entreprise.nom}</strong>
            </p>

            {error && <div className="page-error">{error}</div>}

            <div className="form-grid">
              <label className="field">
                <span>{t('superAdmin.fieldAmountReceived')}</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span>{t('superAdmin.fieldPaymentMethod')}</span>
                <select value={methode} onChange={(e) => setMethode(e.target.value)}>
                  {METHODE_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {paymentMethods[value]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>{t('superAdmin.fieldDurationMonths')}</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={dureeMois}
                  onChange={(e) => setDureeMois(e.target.value)}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>{t('superAdmin.fieldNotes')}</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            {entreprise.date_expiration_abonnement && (
              <p className="field__hint">
                {t('superAdmin.currentSubscriptionValidUntil')}{' '}
                {new Date(entreprise.date_expiration_abonnement).toLocaleDateString('fr-FR')}.{' '}
                {t('superAdmin.renewalWillExtend')}
              </p>
            )}
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving && <LuLoaderCircle className="spin" />}
              {saving ? t('superAdmin.activating') : t('superAdmin.activateSubscriptionTitle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
