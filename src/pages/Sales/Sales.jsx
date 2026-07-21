import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuPlus, LuEye } from 'react-icons/lu';
import { fetchSales } from '../../services/salesService';
import './Sales.css';

const STATUT_LABELS = { devis: 'Devis', commande: 'Commande', facture: 'Facture', annulee: 'Annulée' };
const STATUT_BADGE = {
  devis: 'badge--warning',
  commande: 'badge--warning',
  facture: 'badge--success',
  annulee: 'badge--danger',
};
const PAIEMENT_LABELS = { impaye: 'Impayé', partiel: 'Partiel', paye: 'Payé' };
const PAIEMENT_BADGE = { impaye: 'badge--danger', partiel: 'badge--warning', paye: 'badge--success' };

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSales = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSales();
      setSales(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  return (
    <div className="sales">
      <div className="page-header">
        <div>
          <h1>Ventes</h1>
          <p>Devis, factures et suivi des paiements</p>
        </div>
        <Link to="/ventes/nouvelle" className="btn btn--primary">
          <LuPlus /> Nouvelle vente
        </Link>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">Chargement...</p>
      ) : sales.length === 0 ? (
        <div className="page-empty">
          <p>Aucune vente pour l'instant.</p>
          <Link to="/ventes/nouvelle" className="btn btn--primary">
            <LuPlus /> Créer votre première vente
          </Link>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Client</th>
                <th>Statut</th>
                <th>Paiement</th>
                <th>Total TTC</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="data-table__title">{sale.numero}</td>
                  <td>{sale.client?.nom || sale.client_nom_libre || 'Client comptoir'}</td>
                  <td>
                    <span className={`badge ${STATUT_BADGE[sale.statut]}`}>{STATUT_LABELS[sale.statut]}</span>
                  </td>
                  <td>
                    {sale.statut === 'facture' && (
                      <span className={`badge ${PAIEMENT_BADGE[sale.statut_paiement]}`}>
                        {PAIEMENT_LABELS[sale.statut_paiement]}
                      </span>
                    )}
                  </td>
                  <td>{Number(sale.total_ttc).toLocaleString('fr-FR')} FCFA</td>
                  <td>{new Date(sale.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="data-table__actions">
                    <Link to={`/ventes/${sale.id}`} className="icon-btn" aria-label="Voir">
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
