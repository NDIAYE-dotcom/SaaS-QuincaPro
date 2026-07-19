import { useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { addPurchasePayment } from '../../services/purchasesService';
import './AddPurchasePaymentModal.css';

const MOYEN_OPTIONS = [
  { value: 'especes', label: 'Espèces' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'free_money', label: 'Free Money' },
  { value: 'carte', label: 'Carte bancaire' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
];

export default function AddPurchasePaymentModal({ purchase, onClose, onSaved }) {
  const reste = purchase.total_ttc - purchase.montant_paye;
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
      setError('Le montant doit être positif');
      return;
    }

    setSaving(true);
    try {
      await addPurchasePayment({
        achatId: purchase.id,
        montant: amount,
        moyenPaiement,
        notes: notes.trim() || null,
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
          <h2>Ajouter un paiement</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <LuX />
          </button>
        </div>

        <form className="modal__body stacked-form" onSubmit={handleSubmit}>
          {error && <div className="page-error">{error}</div>}

          <label className="field">
            <span>Montant (FCFA) *</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
            />
            <small className="field__hint">Reste à payer : {reste.toLocaleString('fr-FR')} FCFA</small>
          </label>

          <label className="field">
            <span>Moyen de paiement</span>
            <select value={moyenPaiement} onChange={(e) => setMoyenPaiement(e.target.value)}>
              {MOYEN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Notes</span>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving && <LuLoaderCircle className="spin" />}
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
