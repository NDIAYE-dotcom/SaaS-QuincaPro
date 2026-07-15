import { useCallback, useEffect, useState } from 'react';
import { LuPlus, LuEyeOff, LuEye, LuTrash2 } from 'react-icons/lu';
import {
  fetchAnnouncements,
  setAnnouncementActive,
  deleteAnnouncement,
} from '../../services/superAdminService';
import AnnouncementFormModal from './AnnouncementFormModal';
import './Annonces.css';

export default function Annonces() {
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const loadAnnonces = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAnnouncements();
      setAnnonces(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnonces();
  }, [loadAnnonces]);

  async function handleToggle(annonce) {
    try {
      await setAnnouncementActive(annonce.id, !annonce.actif);
      loadAnnonces();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(annonce) {
    if (!window.confirm(`Supprimer l'annonce « ${annonce.titre} » ?`)) return;
    try {
      await deleteAnnouncement(annonce.id);
      setAnnonces((prev) => prev.filter((a) => a.id !== annonce.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="super-admin-annonces">
      <div className="page-header">
        <div>
          <h1>Annonces</h1>
          <p>Messages diffusés à tous les utilisateurs de QuincaPro</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--primary" onClick={() => setFormOpen(true)}>
            <LuPlus /> Nouvelle annonce
          </button>
        </div>
      </div>

      {error && <div className="page-error">{error}</div>}
      {loading && <p className="page-loading">Chargement...</p>}

      {!loading && annonces.length === 0 && <p className="page-empty">Aucune annonce publiée.</p>}

      {!loading && annonces.length > 0 && (
        <div className="announcement-list">
          {annonces.map((a) => (
            <div key={a.id} className="announcement-card">
              <div className="announcement-card__header">
                <h3>{a.titre}</h3>
                <span className={`badge ${a.actif ? 'badge--success' : 'badge--warning'}`}>
                  {a.actif ? 'Active' : 'Masquée'}
                </span>
              </div>
              <p className="announcement-card__message">{a.message}</p>
              <div className="announcement-card__footer">
                <span className="data-table__subtitle">
                  {new Date(a.created_at).toLocaleDateString('fr-FR')}
                </span>
                <div className="data-table__actions">
                  <button className="icon-btn" title={a.actif ? 'Masquer' : 'Réactiver'} onClick={() => handleToggle(a)}>
                    {a.actif ? <LuEyeOff /> : <LuEye />}
                  </button>
                  <button
                    className="icon-btn icon-btn--danger"
                    title="Supprimer"
                    onClick={() => handleDelete(a)}
                  >
                    <LuTrash2 />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <AnnouncementFormModal
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            loadAnnonces();
          }}
        />
      )}
    </div>
  );
}
