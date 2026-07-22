import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchActivityLog } from '../../services/activityLogService';
import './ActivityLog.css';

export default function ActivityLog() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    fetchActivityLog()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="activity-log">
        <div className="page-header">
          <h1>Journal d'activité</h1>
        </div>
        <div className="page-error">Seul un administrateur peut consulter le journal d'activité.</div>
      </div>
    );
  }

  return (
    <div className="activity-log">
      <div className="page-header">
        <div>
          <h1>Journal d'activité</h1>
          <p>Ventes, achats et mouvements de stock récents, avec l'employé à l'origine de chaque action</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">Chargement...</p>
      ) : items.length === 0 ? (
        <p className="page-empty">Aucune activité pour le moment.</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employé</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.date).toLocaleString('fr-FR')}</td>
                  <td>{item.utilisateur}</td>
                  <td>{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
