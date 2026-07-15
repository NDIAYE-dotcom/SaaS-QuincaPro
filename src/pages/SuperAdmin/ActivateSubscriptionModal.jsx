import { useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { activateSubscription } from '../../services/superAdminService';

const METHODES = [
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'free_money', label: 'Free Money' },
  { value: 'carte', label: 'Carte bancaire' },
  { value: 'virement', label: 'Virement' },
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
];

export default function ActivateSubscriptionModal({ entreprise, onClose, onSaved }) {
  const [montant, setMontant] = useState('5000');
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
      setError('Le montant doit être positif');
      return;
    }
    if (!dureeNum || dureeNum < 1) {
      setError("La durée doit être d'au moins 1 mois");
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
          <h2>Activer l'abonnement</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <LuX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body stacked-form">
            <p className="field__hint">
              Entreprise : <strong>{entreprise.nom}</strong>
            </p>

            {error && <div className="page-error">{error}</div>}

            <div className="form-grid">
              <label className="field">
                <span>Montant reçu (FCFA) *</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span>Moyen de paiement *</span>
                <select value={methode} onChange={(e) => setMethode(e.target.value)}>
                  {METHODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Durée (mois) *</span>
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
              <span>Notes (référence transaction, etc.)</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            {entreprise.date_expiration_abonnement && (
              <p className="field__hint">
                Abonnement actuel valide jusqu'au{' '}
                {new Date(entreprise.date_expiration_abonnement).toLocaleDateString('fr-FR')}. Le
                renouvellement prolongera cette date.
              </p>
            )}
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving && <LuLoaderCircle className="spin" />}
              {saving ? 'Activation...' : "Activer l'abonnement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
