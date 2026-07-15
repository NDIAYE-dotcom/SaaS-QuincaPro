import { useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { createAnnouncement } from '../../services/superAdminService';

export default function AnnouncementFormModal({ onClose, onSaved }) {
  const [titre, setTitre] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!titre.trim() || !message.trim()) {
      setError('Le titre et le message sont requis');
      return;
    }

    setSaving(true);
    try {
      await createAnnouncement({ titre: titre.trim(), message: message.trim() });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>Nouvelle annonce</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <LuX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body stacked-form">
            {error && <div className="page-error">{error}</div>}

            <label className="field">
              <span>Titre *</span>
              <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} required />
            </label>

            <label className="field">
              <span>Message *</span>
              <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
              <span className="field__hint">
                Visible par tous les utilisateurs de toutes les entreprises abonnées.
              </span>
            </label>
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving && <LuLoaderCircle className="spin" />}
              {saving ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
