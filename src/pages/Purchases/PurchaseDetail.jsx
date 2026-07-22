import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LuArrowLeft, LuBan, LuPlus } from 'react-icons/lu';
import { fetchPurchase, cancelPurchase } from '../../services/purchasesService';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import AddPurchasePaymentModal from './AddPurchasePaymentModal';
import PrintButton from '../../shared/PrintButton';
import './PurchaseDetail.css';

export default function PurchaseDetail() {
  const { id } = useParams();
  const { entreprise } = useAuth();
  const { t, language } = useLanguage();

  const STATUT_LABELS = {
    commande: t('purchases.statutCommande'),
    recu: t('purchases.statutRecu'),
    annule: t('purchases.statutAnnule'),
  };
  const PAIEMENT_LABELS = {
    impaye: t('common.paymentUnpaid'),
    partiel: t('common.paymentPartial'),
    paye: t('common.paymentPaid'),
  };
  const MOYEN_LABELS = t('common.paymentMethods');
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
    if (!window.confirm(t('purchases.confirmCancel'))) return;
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

  async function handlePrint(format) {
    try {
      const { generateDocument } = await import('../../services/pdfService');
      await generateDocument(achat, entreprise, 'achat', format, language);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p className="page-loading">{t('common.loading')}</p>;
  if (!achat) return error ? <div className="page-error">{error}</div> : null;

  const reste = achat.total_ttc - achat.montant_paye;

  return (
    <div className="purchase-detail">
      <div className="page-header">
        <div>
          <Link to="/achats" className="purchase-detail__back">
            <LuArrowLeft /> {t('purchases.backToPurchases')}
          </Link>
          <h1>{achat.numero}</h1>
          <p>
            {STATUT_LABELS[achat.statut]}
            {achat.statut === 'recu' && ` · ${PAIEMENT_LABELS[achat.statut_paiement]}`} ·{' '}
            {achat.fournisseur?.nom || t('purchases.noSupplier')}
          </p>
        </div>
        <div className="page-header__actions">
          <PrintButton onPrint={handlePrint} />
          {achat.statut === 'recu' && reste > 0 && (
            <button className="btn btn--primary" onClick={() => setPaymentOpen(true)}>
              <LuPlus /> {t('purchases.addPayment')}
            </button>
          )}
          {achat.statut !== 'annule' && (
            <button className="btn btn--ghost" onClick={handleCancel} disabled={canceling}>
              <LuBan /> {t('purchases.cancelPurchase')}
            </button>
          )}
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('purchases.columnProduct')}</th>
              <th>{t('purchases.columnQty')}</th>
              <th>{t('purchases.columnUnitPrice')}</th>
              <th>{t('purchases.columnVat')}</th>
              <th>{t('purchases.columnLineTotal')}</th>
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
          <span>{t('purchases.subtotal')}</span>
          <span>{Number(achat.sous_total).toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="purchase-detail__summary-row">
          <span>{t('purchases.vat')}</span>
          <span>{Number(achat.total_tva).toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="purchase-detail__summary-row purchase-detail__summary-row--total">
          <span>{t('purchases.totalTtc')}</span>
          <span>{Number(achat.total_ttc).toLocaleString('fr-FR')} FCFA</span>
        </div>
        {achat.statut === 'recu' && (
          <>
            <div className="purchase-detail__summary-row">
              <span>{t('purchases.paid')}</span>
              <span>{Number(achat.montant_paye).toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="purchase-detail__summary-row">
              <span>{t('purchases.remaining')}</span>
              <span>{reste.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </>
        )}
      </div>

      {achat.paiements.length > 0 && (
        <>
          <h2 className="section-title">{t('purchases.paymentsTitle')}</h2>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('purchases.columnDate')}</th>
                  <th>{t('purchases.columnAmount')}</th>
                  <th>{t('purchases.columnMethod')}</th>
                  <th>{t('purchases.columnNotes')}</th>
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
