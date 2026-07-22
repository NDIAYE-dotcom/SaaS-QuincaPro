import { Fragment, useEffect, useState } from 'react';
import { fetchPaydunyaWebhookLogs } from '../../services/superAdminService';
import './PaydunyaLogs.css';

const STATUT_LABELS = { succes: 'Succès', echec: 'Échec', ignore: 'Ignoré' };
const STATUT_BADGE = { succes: 'badge--success', echec: 'badge--danger', ignore: 'badge--warning' };

export default function PaydunyaLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchPaydunyaWebhookLogs()
      .then(setLogs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="paydunya-logs">
      <div className="page-header">
        <div>
          <h1>Paiements PayDunya</h1>
          <p>Journal des appels webhook reçus, pour diagnostiquer un paiement bloqué</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">Chargement...</p>
      ) : logs.length === 0 ? (
        <p className="page-empty">Aucun appel webhook enregistré pour le moment.</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Entreprise</th>
                <th>Statut</th>
                <th>Message</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr>
                    <td>{new Date(log.created_at).toLocaleString('fr-FR')}</td>
                    <td>{log.entreprise?.nom || '—'}</td>
                    <td>
                      <span className={`badge ${STATUT_BADGE[log.statut]}`}>{STATUT_LABELS[log.statut]}</span>
                    </td>
                    <td>{log.message || '—'}</td>
                    <td>
                      {log.payload && (
                        <button
                          type="button"
                          className="btn btn--ghost"
                          onClick={() => setExpandedId((prev) => (prev === log.id ? null : log.id))}
                        >
                          {expandedId === log.id ? 'Masquer' : 'Détails'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && log.payload && (
                    <tr>
                      <td colSpan={5}>
                        <pre className="paydunya-logs__payload">{JSON.stringify(log.payload, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
