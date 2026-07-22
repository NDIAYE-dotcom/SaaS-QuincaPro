import { useMemo, useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { registerStockMovement } from '../../services/stockService';
import { useLanguage } from '../../contexts/LanguageContext';
import './StockMovementModal.css';

export default function StockMovementModal({ type, products, onClose, onSaved }) {
  const { t } = useLanguage();
  const TYPE_OPTIONS = [
    { value: 'entree', label: t('stock.optionIn') },
    { value: 'sortie', label: t('stock.optionOut') },
    { value: 'correction', label: t('stock.optionCorrection') },
    { value: 'inventaire', label: t('stock.optionInventory') },
  ];
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
      setError(t('stock.errorSelectProduct'));
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
          <h2>{t('stock.newMovementTitle')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <LuX />
          </button>
        </div>

        <form className="modal__body stacked-form" onSubmit={handleSubmit}>
          {error && <div className="page-error">{error}</div>}

          <label className="field">
            <span>{t('stock.movementType')}</span>
            <select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t('stock.product')}</span>
            <select value={produitId} onChange={(e) => setProduitId(e.target.value)} required>
              <option value="">{t('stock.selectProduct')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} ({p.quantite_stock} {p.unite} {t('stock.inStock')})
                </option>
              ))}
            </select>
          </label>

          {usesNouvelleQuantite ? (
            <label className="field">
              <span>{t('stock.countedQty')}</span>
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
                  {t('stock.currentStock')} {selectedProduct.quantite_stock} {selectedProduct.unite}
                </small>
              )}
            </label>
          ) : (
            <label className="field">
              <span>{t('stock.qty')}</span>
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
                  {t('stock.currentStock')} {selectedProduct.quantite_stock} {selectedProduct.unite}
                </small>
              )}
            </label>
          )}

          <label className="field">
            <span>{t('stock.reason')}</span>
            <input
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              placeholder={t('stock.reasonPlaceholder')}
            />
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
