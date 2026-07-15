import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuTrash2, LuLoaderCircle, LuSearch } from 'react-icons/lu';
import { fetchProducts } from '../../services/productService';
import { fetchSuppliers } from '../../services/supplierService';
import { createPurchase } from '../../services/purchasesService';
import './NewPurchase.css';

export default function NewPurchase() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [fournisseurId, setFournisseurId] = useState('');
  const [statut, setStatut] = useState('recu');
  const [lignes, setLignes] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [montantPayeInitial, setMontantPayeInitial] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProducts().then(setProducts).catch((err) => setError(err.message));
    fetchSuppliers().then(setSuppliers).catch((err) => setError(err.message));
  }, []);

  const searchResults = useMemo(() => {
    if (!productSearch.trim()) return [];
    const term = productSearch.toLowerCase();
    return products
      .filter((p) => p.nom.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term))
      .slice(0, 8);
  }, [products, productSearch]);

  function addLigne(produit) {
    if (lignes.some((l) => l.produit_id === produit.id)) return;
    setLignes((prev) => [
      ...prev,
      {
        produit_id: produit.id,
        nom: produit.nom,
        unite: produit.unite,
        quantite: '1',
        prix_unitaire: String(produit.prix_achat || 0),
        taux_tva: String(produit.taux_tva || 0),
      },
    ]);
    setProductSearch('');
  }

  function updateLigne(index, field, value) {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function removeLigne(index) {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  }

  const totals = useMemo(() => {
    let sousTotal = 0;
    let totalTva = 0;
    for (const l of lignes) {
      const ht = (Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0);
      const tva = (ht * (Number(l.taux_tva) || 0)) / 100;
      sousTotal += ht;
      totalTva += tva;
    }
    return { sousTotal, totalTva, totalTtc: sousTotal + totalTva };
  }, [lignes]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (lignes.length === 0) {
      setError('Ajoutez au moins un produit');
      return;
    }

    setSaving(true);
    try {
      const achat = await createPurchase({
        fournisseurId: fournisseurId || null,
        statut,
        lignes: lignes.map((l) => ({
          produit_id: l.produit_id,
          quantite: Number(l.quantite) || 0,
          prix_unitaire: Number(l.prix_unitaire) || 0,
          taux_tva: Number(l.taux_tva) || 0,
        })),
        montantPayeInitial: statut === 'recu' ? Number(montantPayeInitial) || 0 : 0,
        notes: notes.trim() || null,
      });
      navigate(`/achats/${achat.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="new-purchase">
      <div className="page-header">
        <div>
          <h1>Nouvel achat</h1>
          <p>Commande fournisseur ou réception directe</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <form onSubmit={handleSubmit} className="new-purchase__layout">
        <div className="new-purchase__main">
          <div className="new-purchase__card">
            <div className="form-grid">
              <label className="field">
                <span>Statut</span>
                <select value={statut} onChange={(e) => setStatut(e.target.value)}>
                  <option value="recu">Reçu (met à jour le stock)</option>
                  <option value="commande">Commande (pas encore reçue)</option>
                </select>
              </label>

              <label className="field">
                <span>Fournisseur (optionnel)</span>
                <select value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)}>
                  <option value="">Aucun</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nom}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="new-purchase__card">
            <h2 className="new-purchase__card-title">Produits</h2>

            <div className="new-purchase__product-search">
              <LuSearch />
              <input
                type="text"
                placeholder="Rechercher un produit à ajouter..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            {searchResults.length > 0 && (
              <div className="new-purchase__search-results">
                {searchResults.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className="new-purchase__search-result"
                    onClick={() => addLigne(p)}
                  >
                    <span>{p.nom}</span>
                    <span className="new-purchase__search-result-meta">
                      Dernier prix d'achat : {Number(p.prix_achat).toLocaleString('fr-FR')} FCFA
                    </span>
                  </button>
                ))}
              </div>
            )}

            {lignes.length === 0 ? (
              <p className="page-empty">Aucun produit ajouté.</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th>Qté</th>
                      <th>Prix unit.</th>
                      <th>TVA %</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l, index) => {
                      const ht = (Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0);
                      const total = ht + (ht * (Number(l.taux_tva) || 0)) / 100;
                      return (
                        <tr key={l.produit_id}>
                          <td className="data-table__title">{l.nom}</td>
                          <td>
                            <input
                              type="number"
                              min="0.01"
                              step="1"
                              className="new-purchase__cell-input"
                              value={l.quantite}
                              onChange={(e) => updateLigne(index, 'quantite', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="new-purchase__cell-input"
                              value={l.prix_unitaire}
                              onChange={(e) => updateLigne(index, 'prix_unitaire', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              className="new-purchase__cell-input"
                              value={l.taux_tva}
                              onChange={(e) => updateLigne(index, 'taux_tva', e.target.value)}
                            />
                          </td>
                          <td>{total.toLocaleString('fr-FR')} FCFA</td>
                          <td>
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              onClick={() => removeLigne(index)}
                              aria-label="Retirer"
                            >
                              <LuTrash2 />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="new-purchase__card">
            <label className="field">
              <span>Notes</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
        </div>

        <aside className="new-purchase__summary">
          <div className="new-purchase__card">
            <h2 className="new-purchase__card-title">Résumé</h2>
            <div className="new-purchase__totals">
              <div className="new-purchase__totals-row">
                <span>Sous-total</span>
                <span>{totals.sousTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="new-purchase__totals-row">
                <span>TVA</span>
                <span>{totals.totalTva.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="new-purchase__totals-row new-purchase__totals-row--total">
                <span>Total TTC</span>
                <span>{totals.totalTtc.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            {statut === 'recu' && (
              <label className="field">
                <span>Montant payé maintenant</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={montantPayeInitial}
                  onChange={(e) => setMontantPayeInitial(e.target.value)}
                />
              </label>
            )}

            <button type="submit" className="btn btn--primary new-purchase__submit" disabled={saving}>
              {saving && <LuLoaderCircle className="spin" />}
              {saving ? 'Création...' : statut === 'commande' ? 'Créer la commande' : "Enregistrer l'achat"}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
