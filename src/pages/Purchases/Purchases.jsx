import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuPlus, LuEye } from 'react-icons/lu';
import { fetchPurchases } from '../../services/purchasesService';
import './Purchases.css';

const STATUT_LABELS = { commande: 'Commande', recu: 'Reçu', annule: 'Annulé' };
const STATUT_BADGE = { commande: 'badge--warning', recu: 'badge--success', annule: 'badge--danger' };
const PAIEMENT_LABELS = { impaye: 'Impayé', partiel: 'Partiel', paye: 'Payé' };
const PAIEMENT_BADGE = { impaye: 'badge--danger', partiel: 'badge--warning', paye: 'badge--success' };

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPurchases();
      setPurchases(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  return (
    <div className="purchases">
      <div className="page-header">
        <div>
          <h1>Achats</h1>
          <p>Commandes fournisseurs, réceptions et paiements</p>
        </div>
        <Link to="/achats/nouveau" className="btn btn--primary">
          <LuPlus /> Nouvel achat
        </Link>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">Chargement...</p>
      ) : purchases.length === 0 ? (
        <div className="page-empty">
          <p>Aucun achat pour l'instant.</p>
          <Link to="/achats/nouveau" className="btn btn--primary">
            <LuPlus /> Créer votre premier achat
          </Link>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Fournisseur</th>
                <th>Statut</th>
                <th>Paiement</th>
                <th>Total TTC</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((achat) => (
                <tr key={achat.id}>
                  <td className="data-table__title">{achat.numero}</td>
                  <td>{achat.fournisseur?.nom || '—'}</td>
                  <td>
                    <span className={`badge ${STATUT_BADGE[achat.statut]}`}>{STATUT_LABELS[achat.statut]}</span>
                  </td>
                  <td>
                    {achat.statut === 'recu' && (
                      <span className={`badge ${PAIEMENT_BADGE[achat.statut_paiement]}`}>
                        {PAIEMENT_LABELS[achat.statut_paiement]}
                      </span>
                    )}
                  </td>
                  <td>{Number(achat.total_ttc).toLocaleString('fr-FR')} FCFA</td>
                  <td>{new Date(achat.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="data-table__actions">
                    <Link to={`/achats/${achat.id}`} className="icon-btn" aria-label="Voir">
                      <LuEye />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
