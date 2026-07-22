import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LuTrash2, LuLoaderCircle, LuSearch } from 'react-icons/lu';
import { fetchProducts } from '../../services/productService';
import { fetchClients } from '../../services/clientService';
import { createSale } from '../../services/salesService';
import { useLanguage } from '../../contexts/LanguageContext';
import './NewSale.css';

const TAUX_TVA_STANDARD = 18;
const CLIENT_PASSAGE = '__passage__';

export default function NewSale() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState('');
  const [clientNomLibre, setClientNomLibre] = useState('');
  const [clientTelephoneLibre, setClientTelephoneLibre] = useState('');
  const [statut, setStatut] = useState('facture');
  const [typeFacture, setTypeFacture] = useState('tva');
  const [lignes, setLignes] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [montantPayeInitial, setMontantPayeInitial] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProducts().then(setProducts).catch((err) => setError(err.message));
    fetchClients().then(setClients).catch((err) => setError(err.message));
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
        stockDisponible: produit.quantite_stock,
        quantite: '1',
        prix_unitaire: String(produit.prix_vente),
        taux_tva: typeFacture === 'tva' ? String(TAUX_TVA_STANDARD) : '0',
        remise_pourcentage: String(produit.remise_pourcentage || 0),
      },
    ]);
    setProductSearch('');
  }

  function handleTypeFactureChange(value) {
    setTypeFacture(value);
    setLignes((prev) => prev.map((l) => ({ ...l, taux_tva: value === 'tva' ? String(TAUX_TVA_STANDARD) : '0' })));
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
      const htRemise = ht - (ht * (Number(l.remise_pourcentage) || 0)) / 100;
      const tva = (htRemise * (Number(l.taux_tva) || 0)) / 100;
      sousTotal += htRemise;
      totalTva += tva;
    }
    return { sousTotal, totalTva, totalTtc: sousTotal + totalTva };
  }, [lignes]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (lignes.length === 0) {
      setError(t('sales.errorAddProduct'));
      return;
    }

    for (const l of lignes) {
      if (statut === 'facture' && Number(l.quantite) > l.stockDisponible) {
        setError(t('sales.errorInsufficientStock', { name: l.nom, available: l.stockDisponible, unit: l.unite }));
        return;
      }
    }

    if (statut === 'facture' && (Number(montantPayeInitial) || 0) > totals.totalTtc) {
      setError(t('sales.errorAmountExceedsTotal'));
      return;
    }

    const isClientPassage = clientId === CLIENT_PASSAGE;
    if (isClientPassage && !clientNomLibre.trim()) {
      setError(t('sales.errorWalkInNameRequired'));
      return;
    }

    setSaving(true);
    try {
      const sale = await createSale({
        clientId: isClientPassage ? null : clientId || null,
        clientNomLibre: isClientPassage ? clientNomLibre.trim() : null,
        clientTelephoneLibre: isClientPassage ? clientTelephoneLibre.trim() : null,
        statut,
        typeFacture,
        lignes: lignes.map((l) => ({
          produit_id: l.produit_id,
          quantite: Number(l.quantite) || 0,
          prix_unitaire: Number(l.prix_unitaire) || 0,
          taux_tva: Number(l.taux_tva) || 0,
          remise_pourcentage: Number(l.remise_pourcentage) || 0,
        })),
        montantPayeInitial: statut === 'facture' ? Number(montantPayeInitial) || 0 : 0,
        notes: notes.trim() || null,
      });
      navigate(`/ventes/${sale.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="new-sale">
      <div className="page-header">
        <div>
          <h1>{t('sales.newSaleTitle')}</h1>
          <p>{t('sales.newSaleSubtitle')}</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <form onSubmit={handleSubmit} className="new-sale__layout">
        <div className="new-sale__main">
          <div className="new-sale__card">
            <div className="form-grid">
              <label className="field">
                <span>{t('sales.documentType')}</span>
                <select value={statut} onChange={(e) => setStatut(e.target.value)}>
                  <option value="facture">{t('sales.optionInvoice')}</option>
                  <option value="devis">{t('sales.optionQuote')}</option>
                </select>
              </label>

              <label className="field">
                <span>{t('sales.invoiceType')}</span>
                <select value={typeFacture} onChange={(e) => handleTypeFactureChange(e.target.value)}>
                  <option value="tva">{t('sales.optionInvoiceVat')}</option>
                  <option value="hors_taxe">{t('sales.optionInvoiceNoVat')}</option>
                </select>
              </label>

              <label className="field">
                <span>{t('sales.clientOptional')}</span>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">{t('sales.walkInClient')}</option>
                  <option value={CLIENT_PASSAGE}>{t('sales.walkInClientOption')}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </label>

              {clientId === CLIENT_PASSAGE && (
                <>
                  <label className="field">
                    <span>{t('sales.walkInName')}</span>
                    <input
                      type="text"
                      value={clientNomLibre}
                      onChange={(e) => setClientNomLibre(e.target.value)}
                      placeholder={t('sales.walkInNamePlaceholder')}
                    />
                  </label>
                  <label className="field">
                    <span>{t('sales.walkInPhone')}</span>
                    <input
                      type="tel"
                      value={clientTelephoneLibre}
                      onChange={(e) => setClientTelephoneLibre(e.target.value)}
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="new-sale__card">
            <h2 className="new-sale__card-title">{t('sales.productsTitle')}</h2>

            <div className="new-sale__product-search">
              <LuSearch />
              <input
                type="text"
                placeholder={t('sales.searchProductPlaceholder')}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            {searchResults.length > 0 && (
              <div className="new-sale__search-results">
                {searchResults.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className="new-sale__search-result"
                    onClick={() => addLigne(p)}
                  >
                    <span>{p.nom}</span>
                    <span className="new-sale__search-result-meta">
                      {Number(p.prix_vente).toLocaleString('fr-FR')} FCFA · {p.quantite_stock} {p.unite}{' '}
                      {t('sales.inStock')}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {lignes.length === 0 ? (
              <p className="page-empty">{t('sales.noProductsAdded')}</p>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('sales.columnProduct')}</th>
                      <th>{t('sales.columnQty')}</th>
                      <th>{t('sales.columnUnitPrice')}</th>
                      <th>{t('sales.columnDiscount')}</th>
                      <th>{t('sales.columnVat')}</th>
                      <th>{t('sales.columnLineTotal')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l, index) => {
                      const ht = (Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0);
                      const htRemise = ht - (ht * (Number(l.remise_pourcentage) || 0)) / 100;
                      const total = htRemise + (htRemise * (Number(l.taux_tva) || 0)) / 100;
                      return (
                        <tr key={l.produit_id}>
                          <td className="data-table__title">{l.nom}</td>
                          <td>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              className="new-sale__cell-input"
                              value={l.quantite}
                              onChange={(e) => updateLigne(index, 'quantite', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="new-sale__cell-input"
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
                              className="new-sale__cell-input"
                              value={l.remise_pourcentage}
                              onChange={(e) => updateLigne(index, 'remise_pourcentage', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              className="new-sale__cell-input"
                              value={l.taux_tva}
                              onChange={(e) => updateLigne(index, 'taux_tva', e.target.value)}
                              disabled={typeFacture === 'hors_taxe'}
                            />
                          </td>
                          <td>{total.toLocaleString('fr-FR')} FCFA</td>
                          <td>
                            <button
                              type="button"
                              className="icon-btn icon-btn--danger"
                              onClick={() => removeLigne(index)}
                              aria-label={t('sales.remove')}
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

          <div className="new-sale__card">
            <label className="field">
              <span>{t('sales.notes')}</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </div>
        </div>

        <aside className="new-sale__summary">
          <div className="new-sale__card">
            <h2 className="new-sale__card-title">{t('sales.summary')}</h2>
            <div className="new-sale__totals">
              <div className="new-sale__totals-row">
                <span>{t('sales.subtotal')}</span>
                <span>{totals.sousTotal.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="new-sale__totals-row">
                <span>{t('sales.vat')}</span>
                <span>{totals.totalTva.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="new-sale__totals-row new-sale__totals-row--total">
                <span>{t('sales.totalTtc')}</span>
                <span>{totals.totalTtc.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>

            {statut === 'facture' && (
              <label className="field">
                <span>{t('sales.amountPaidNow')}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montantPayeInitial}
                  onChange={(e) => setMontantPayeInitial(e.target.value)}
                />
              </label>
            )}

            <button type="submit" className="btn btn--primary new-sale__submit" disabled={saving}>
              {saving && <LuLoaderCircle className="spin" />}
              {saving ? t('sales.creating') : statut === 'devis' ? t('sales.createQuote') : t('sales.createInvoice')}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
