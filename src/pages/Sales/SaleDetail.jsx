import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuArrowLeft, LuBan, LuPlus } from 'react-icons/lu';
import { fetchSale, cancelSale } from '../../services/salesService';
import { useAuth } from '../../contexts/AuthContext';
import AddPaymentModal from './AddPaymentModal';
import PrintButton from '../../shared/PrintButton';
import './SaleDetail.css';

const STATUT_LABELS = { devis: 'Devis', commande: 'Commande', facture: 'Facture', annulee: 'Annulée' };
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

export default function SaleDetail() {
  const { id } = useParams();
  const { entreprise } = useAuth();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const loadSale = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSale(id);
      setSale(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSale();
  }, [loadSale]);

  async function handleCancel() {
    if (!window.confirm('Annuler cette vente ? Le stock sera restitué et la dette client ajustée.')) return;
    setCanceling(true);
    try {
      await cancelSale(id);
      await loadSale();
    } catch (err) {
      setError(err.message);
    } finally {
      setCanceling(false);
    }
  }

  async function handlePrint(format) {
    try {
      const { generateDocument } = await import('../../services/pdfService');
      await generateDocument(sale, entreprise, 'vente', format);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="page-loading">Chargement...</p>;
  if (!sale) return error ? <div className="page-error">{error}</div> : null;

  const reste = sale.total_ttc - sale.montant_paye;

  return (
    <div className="sale-detail">
      <div className="page-header">
        <div>
          <Link to="/ventes" className="sale-detail__back">
            <LuArrowLeft /> Retour aux ventes
          </Link>
          <h1>{sale.numero}</h1>
          <p>
            {STATUT_LABELS[sale.statut]}
            {sale.statut === 'facture' && ` · ${PAIEMENT_LABELS[sale.statut_paiement]}`} ·{' '}
            {sale.client?.nom || sale.client_nom_libre || 'Client comptoir'}
          </p>
        </div>
        <div className="page-header__actions">
          <PrintButton onPrint={handlePrint} />
          {sale.statut === 'facture' && reste > 0 && (
            <button className="btn btn--primary" onClick={() => setPaymentOpen(true)}>
              <LuPlus /> Ajouter un paiement
            </button>
          )}
          {sale.statut !== 'annulee' && (
            <button className="btn btn--ghost" onClick={handleCancel} disabled={canceling}>
              <LuBan /> Annuler la vente
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
              <th>Remise</th>
              <th>TVA</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.lignes.map((l) => (
              <tr key={l.id}>
                <td className="data-table__title">{l.produit?.nom}</td>
                <td>
                  {l.quantite} {l.produit?.unite}
                </td>
                <td>{Number(l.prix_unitaire).toLocaleString('fr-FR')} FCFA</td>
                <td>{l.remise_pourcentage}%</td>
                <td>{l.taux_tva}%</td>
                <td>{Number(l.total_ligne).toLocaleString('fr-FR')} FCFA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sale-detail__summary">
        <div className="sale-detail__summary-row">
          <span>Sous-total</span>
          <span>{Number(sale.sous_total).toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="sale-detail__summary-row">
          <span>TVA</span>
          <span>{Number(sale.total_tva).toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="sale-detail__summary-row sale-detail__summary-row--total">
          <span>Total TTC</span>
          <span>{Number(sale.total_ttc).toLocaleString('fr-FR')} FCFA</span>
        </div>
        {sale.statut === 'facture' && (
          <>
            <div className="sale-detail__summary-row">
              <span>Payé</span>
              <span>{Number(sale.montant_paye).toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="sale-detail__summary-row">
              <span>Reste à payer</span>
              <span>{reste.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </>
        )}
      </div>

      {sale.paiements.length > 0 && (
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
                {sale.paiements.map((p) => (
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
        <AddPaymentModal
          sale={sale}
          onClose={() => setPaymentOpen(false)}
          onSaved={() => {
            setPaymentOpen(false);
            loadSale();
          }}
        />
      )}
    </div>
  );
}
