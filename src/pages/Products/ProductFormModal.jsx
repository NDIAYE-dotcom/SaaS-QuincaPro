import { useState } from 'react';
import { LuX, LuUpload, LuLoaderCircle } from 'react-icons/lu';
import { createProduct, updateProduct } from '../../services/productService';
import { uploadProductPhoto, deleteProductPhoto } from '../../services/storageService';
import { registerStockMovement } from '../../services/stockService';
import { useAuth } from '../../contexts/AuthContext';
import './ProductFormModal.css';

const EMPTY_FORM = {
  nom: '',
  description: '',
  sku: '',
  code_barre: '',
  categorie_id: '',
  marque: '',
  unite: 'Pièce',
  prix_achat: '',
  prix_vente: '',
  taux_tva: '0',
  remise_pourcentage: '0',
  stock_minimum: '0',
  stock_maximum: '',
  stock_critique: '0',
  stock_initial: '0',
};

function toFormState(product) {
  if (!product) return EMPTY_FORM;
  return {
    nom: product.nom || '',
    description: product.description || '',
    sku: product.sku || '',
    code_barre: product.code_barre || '',
    categorie_id: product.categorie_id || '',
    marque: product.marque || '',
    unite: product.unite || 'Pièce',
    prix_achat: String(product.prix_achat ?? ''),
    prix_vente: String(product.prix_vente ?? ''),
    taux_tva: String(product.taux_tva ?? '0'),
    remise_pourcentage: String(product.remise_pourcentage ?? '0'),
    stock_minimum: String(product.stock_minimum ?? '0'),
    stock_maximum: product.stock_maximum != null ? String(product.stock_maximum) : '',
    stock_critique: String(product.stock_critique ?? '0'),
    stock_initial: '0',
  };
}

export default function ProductFormModal({ product, categories, onClose, onSaved }) {
  const { entreprise } = useAuth();
  const isEditing = Boolean(product);
  const [form, setForm] = useState(() => toFormState(product));
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(product?.photo_url || null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.nom.trim()) {
      setError('Le nom du produit est requis');
      return;
    }

    setSaving(true);
    try {
      let photoUrl = product?.photo_url || null;
      if (photoFile) {
        photoUrl = await uploadProductPhoto(entreprise.id, photoFile);
        if (isEditing && product.photo_url) {
          await deleteProductPhoto(product.photo_url);
        }
      }

      const payload = {
        nom: form.nom.trim(),
        description: form.description.trim() || null,
        sku: form.sku.trim() || null,
        code_barre: form.code_barre.trim() || null,
        categorie_id: form.categorie_id || null,
        marque: form.marque.trim() || null,
        unite: form.unite.trim() || 'Pièce',
        prix_achat: Number(form.prix_achat) || 0,
        prix_vente: Number(form.prix_vente) || 0,
        taux_tva: Number(form.taux_tva) || 0,
        remise_pourcentage: Number(form.remise_pourcentage) || 0,
        stock_minimum: Number(form.stock_minimum) || 0,
        stock_maximum: form.stock_maximum === '' ? null : Number(form.stock_maximum),
        stock_critique: Number(form.stock_critique) || 0,
        photo_url: photoUrl,
      };

      if (isEditing) {
        await updateProduct(product.id, payload);
      } else {
        const created = await createProduct(payload);
        const stockInitial = Number(form.stock_initial) || 0;
        if (stockInitial > 0) {
          await registerStockMovement({
            produitId: created.id,
            type: 'inventaire',
            nouvelleQuantite: stockInitial,
            motif: 'Stock initial',
          });
        }
      }
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
          <h2>{isEditing ? 'Modifier le produit' : 'Nouveau produit'}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <LuX />
          </button>
        </div>

        <form className="modal__body stacked-form" onSubmit={handleSubmit}>
          {error && <div className="page-error">{error}</div>}

          <div className="product-form__photo">
            <label htmlFor="photo-input" className="product-form__photo-drop">
              {photoPreview ? (
                <img src={photoPreview} alt="Aperçu" />
              ) : (
                <span>
                  <LuUpload /> Ajouter une photo
                </span>
              )}
            </label>
            <input id="photo-input" type="file" accept="image/*" onChange={handlePhotoChange} hidden />
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Nom du produit *</span>
              <input type="text" value={form.nom} onChange={update('nom')} required />
            </label>

            <label className="field">
              <span>Catégorie</span>
              <select value={form.categorie_id} onChange={update('categorie_id')}>
                <option value="">Aucune</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? `— ${c.nom}` : c.nom}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Marque</span>
              <input type="text" value={form.marque} onChange={update('marque')} />
            </label>

            <label className="field">
              <span>Unité</span>
              <input type="text" value={form.unite} onChange={update('unite')} placeholder="Pièce, Sac, Kg..." />
            </label>

            <label className="field">
              <span>SKU</span>
              <input type="text" value={form.sku} onChange={update('sku')} />
            </label>

            <label className="field">
              <span>Code-barre</span>
              <input type="text" value={form.code_barre} onChange={update('code_barre')} />
            </label>

            <label className="field">
              <span>Prix d'achat (FCFA)</span>
              <input type="number" min="0" step="1" value={form.prix_achat} onChange={update('prix_achat')} />
            </label>

            <label className="field">
              <span>Prix de vente (FCFA) *</span>
              <input type="number" min="0" step="1" value={form.prix_vente} onChange={update('prix_vente')} required />
            </label>

            <label className="field">
              <span>TVA (%)</span>
              <input type="number" min="0" max="100" step="0.01" value={form.taux_tva} onChange={update('taux_tva')} />
            </label>

            <label className="field">
              <span>Remise (%)</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.remise_pourcentage}
                onChange={update('remise_pourcentage')}
              />
            </label>

            <label className="field">
              <span>{isEditing ? 'Quantité en stock' : 'Stock initial'}</span>
              {isEditing ? (
                <input type="text" value={`${product.quantite_stock} ${product.unite}`} disabled />
              ) : (
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock_initial}
                  onChange={update('stock_initial')}
                />
              )}
              {isEditing && <small className="field__hint">Ajustez la quantité depuis le module Stock</small>}
            </label>

            <label className="field">
              <span>Stock minimum</span>
              <input type="number" min="0" step="1" value={form.stock_minimum} onChange={update('stock_minimum')} />
            </label>

            <label className="field">
              <span>Stock critique</span>
              <input type="number" min="0" step="1" value={form.stock_critique} onChange={update('stock_critique')} />
            </label>

            <label className="field">
              <span>Stock maximum</span>
              <input type="number" min="0" step="1" value={form.stock_maximum} onChange={update('stock_maximum')} />
            </label>
          </div>

          <label className="field">
            <span>Description</span>
            <textarea rows={3} value={form.description} onChange={update('description')} />
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
