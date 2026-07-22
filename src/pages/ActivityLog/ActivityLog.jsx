import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { fetchActivityLog } from '../../services/activityLogService';
import './ActivityLog.css';

export default function ActivityLog() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    fetchActivityLog({}, t)
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin, t]);

  if (!isAdmin) {
    return (
      <div className="activity-log">
        <div className="page-header">
          <h1>{t('activityLog.title')}</h1>
        </div>
        <div className="page-error">{t('activityLog.adminOnly')}</div>
      </div>
    );
  }

  return (
    <div className="activity-log">
      <div className="page-header">
        <div>
          <h1>{t('activityLog.title')}</h1>
          <p>{t('activityLog.subtitle')}</p>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}

      {loading ? (
        <p className="page-loading">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <p className="page-empty">{t('activityLog.noActivityYet')}</p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('activityLog.columnDate')}</th>
                <th>{t('activityLog.columnEmployee')}</th>
                <th>{t('activityLog.columnAction')}</th>
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
