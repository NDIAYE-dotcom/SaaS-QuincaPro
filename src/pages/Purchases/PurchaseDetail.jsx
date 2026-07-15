import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuArrowLeft, LuBan, LuPlus } from 'react-icons/lu';
import { fetchPurchase, cancelPurchase } from '../../services/purchasesService';
import AddPurchasePaymentModal from './AddPurchasePaymentModal';
import './PurchaseDetail.css';

const STATUT_LABELS = { commande: 'Commande', recu: 'Reçu', annule: 'Annulé' };
const PAIEMENT_LABELS = { impaye: 'Impayé', partiel: 'Partiel', paye: 'Payé' };
const MOYEN_LABELS = {
  especes: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  carte: 'Carte bancaire',
  virement: 'Virement',
  cheque: 'Chèque',
};

export default function PurchaseDetail() {
  const { id } = useParams();
  const [achat, setAchat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const loadPurchase = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPurchase(id);
      setAchat(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPurchase();
  }, [loadPurchase]);

  async function handleCancel() {
    if (!window.confirm('Annuler cet achat ? Le stock sera retiré et la dette fournisseur ajustée.')) return;
    setCanceling(true);
    try {
      await cancelPurchase(id);
      await loadPurchase();
    } catch (err) {
      setError(err.message);
    } finally {
      setCanceling(false);
    }
  }

  if (loading) return <p className="page-loading">Chargement...</p>;
  if (!achat) return error ? <div className="page-error">{error}</div> : null;

  const reste = achat.total_ttc - achat.montant_paye;

  return (
    <div className="purchase-detail">
      <div className="page-header">
        <div>
          <Link to="/achats" className="purchase-detail__back">
            <LuArrowLeft /> Retour aux achats
          </Link>
          <h1>{achat.numero}</h1>
          <p>
            {STATUT_LABELS[achat.statut]}
            {achat.statut === 'recu' && ` · ${PAIEMENT_LABELS[achat.statut_paiement]}`} ·{' '}
            {achat.fournisseur?.nom || 'Sans fournisseur'}
          </p>
        </div>
        <div className="page-header__actions">
          {achat.statut === 'recu' && reste > 0 && (
            <button className="btn btn--primary" onClick={() => setPaymentOpen(true)}>
              <LuPlus /> Ajouter un paiement
            </button>
          )}
          {achat.statut !== 'annule' && (
            <button className="btn btn--ghost" onClick={handleCancel} disabled={canceling}>
              <LuBan /> Annuler l'achat
            </button>
          )}
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Qté</th>
              <th>Prix unit.</th>
              <th>TVA</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {achat.lignes.map((l) => (
              <tr key={l.id}>
                <td className="data-table__title">{l.produit?.nom}</td>
                <td>
                  {l.quantite} {l.produit?.unite}
                </td>
                <td>{Number(l.prix_unitaire).toLocaleString('fr-FR')} FCFA</td>
                <td>{l.taux_tva}%</td>
                <td>{Number(l.total_ligne).toLocaleString('fr-FR')} FCFA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="purchase-detail__summary">
        <div className="purchase-detail__summary-row">
          <span>Sous-total</span>
          <span>{Number(achat.sous_total).toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="purchase-detail__summary-row">
          <span>TVA</span>
          <span>{Number(achat.total_tva).toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="purchase-detail__summary-row purchase-detail__summary-row--total">
          <span>Total TTC</span>
          <span>{Number(achat.total_ttc).toLocaleString('fr-FR')} FCFA</span>
        </div>
        {achat.statut === 'recu' && (
          <>
            <div className="purchase-detail__summary-row">
              <span>Payé</span>
              <span>{Number(achat.montant_paye).toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="purchase-detail__summary-row">
              <span>Reste à payer</span>
              <span>{reste.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </>
        )}
      </div>

      {achat.paiements.length > 0 && (
        <>
          <h2 className="section-title">Paiements</h2>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Montant</th>
                  <th>Moyen</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {achat.paiements.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.created_at).toLocaleString('fr-FR')}</td>
                    <td>{Number(p.montant).toLocaleString('fr-FR')} FCFA</td>
                    <td>{MOYEN_LABELS[p.moyen_paiement] || p.moyen_paiement}</td>
                    <td>{p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {paymentOpen && (
        <AddPurchasePaymentModal
          purchase={achat}
          onClose={() => setPaymentOpen(false)}
          onSaved={() => {
            setPaymentOpen(false);
            loadPurchase();
          }}
        />
      )}
    </div>
  );
}
