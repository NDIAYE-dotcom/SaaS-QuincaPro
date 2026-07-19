import { useMemo, useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { registerStockMovement } from '../../services/stockService';
import './StockMovementModal.css';

const TYPE_OPTIONS = [
  { value: 'entree', label: 'Entrée (réception, retour...)' },
  { value: 'sortie', label: 'Sortie (perte, casse, usage interne...)' },
  { value: 'correction', label: 'Correction ponctuelle' },
  { value: 'inventaire', label: 'Inventaire (comptage complet)' },
];

export default function StockMovementModal({ type, products, onClose, onSaved }) {
  const [produitId, setProduitId] = useState('');
  const [movementType, setMovementType] = useState(type);
  const [quantite, setQuantite] = useState('');
  const [nouvelleQuantite, setNouvelleQuantite] = useState('');
  const [motif, setMotif] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === produitId) || null,
    [products, produitId],
  );

  const usesNouvelleQuantite = movementType === 'correction' || movementType === 'inventaire';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!produitId) {
      setError('Sélectionnez un produit');
      return;
    }

    setSaving(true);
    try {
      await registerStockMovement({
        produitId,
        type: movementType,
        quantite: usesNouvelleQuantite ? 0 : Number(quantite) || 0,
        nouvelleQuantite: usesNouvelleQuantite ? Number(nouvelleQuantite) || 0 : null,
        motif: motif.trim() || null,
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
          <h2>Nouveau mouvement de stock</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <LuX />
          </button>
        </div>

        <form className="modal__body stacked-form" onSubmit={handleSubmit}>
          {error && <div className="page-error">{error}</div>}

          <label className="field">
            <span>Type de mouvement</span>
            <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Produit *</span>
            <select value={produitId} onChange={(e) => setProduitId(e.target.value)} required>
              <option value="">Sélectionner un produit</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} ({p.quantite_stock} {p.unite} en stock)
                </option>
              ))}
            </select>
          </label>

          {usesNouvelleQuantite ? (
            <label className="field">
              <span>Quantité comptée *</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={nouvelleQuantite}
                onChange={(e) => setNouvelleQuantite(e.target.value)}
                required
              />
              {selectedProduct && (
                <small className="field__hint">
                  Stock actuel : {selectedProduct.quantite_stock} {selectedProduct.unite}
                </small>
              )}
            </label>
          ) : (
            <label className="field">
              <span>Quantité *</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                required
              />
              {selectedProduct && (
                <small className="field__hint">
                  Stock actuel : {selectedProduct.quantite_stock} {selectedProduct.unite}
                </small>
              )}
            </label>
          )}

          <label className="field">
            <span>Motif</span>
            <input
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder="Réception fournisseur, casse, comptage mensuel..."
            />
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
