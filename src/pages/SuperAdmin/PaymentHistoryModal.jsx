import { useEffect, useState } from 'react';
import { LuX } from 'react-icons/lu';
import { fetchPaymentHistory } from '../../services/superAdminService';

const METHODE_LABELS = {
  especes: 'Espèces',
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  carte: 'Carte bancaire',
  virement: 'Virement',
  cheque: 'Chèque',
};

export default function PaymentHistoryModal({ entreprise, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPaymentHistory(entreprise.id);
        setPayments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [entreprise.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Historique — {entreprise.nom}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <LuX />
          </button>
        </div>

        <div className="modal__body">
          {error && <div className="page-error">{error}</div>}
          {loading && <p className="page-loading">Chargement...</p>}

          {!loading && payments.length === 0 && (
            <p className="page-empty">Aucun paiement enregistré pour cette entreprise.</p>
          )}

          {!loading && payments.length > 0 && (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Montant</th>
                    <th>Moyen</th>
                    <th>Période couverte</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
                      <td>{Number(p.montant).toLocaleString('fr-FR')} FCFA</td>
                      <td>{METHODE_LABELS[p.methode] || p.methode}</td>
                      <td>
                        {new Date(p.periode_debut).toLocaleDateString('fr-FR')} →{' '}
                        {new Date(p.periode_fin).toLocaleDateString('fr-FR')}
                      </td>
                      <td>{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
