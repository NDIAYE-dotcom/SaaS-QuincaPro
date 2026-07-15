import { useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { createInvitation } from '../../services/teamService';
import { ROLE_LABELS, INVITABLE_ROLES } from '../../constants/roles';

export default function InviteMemberModal({ onClose, onSaved }) {
  const [email, setEmail] = useState('');
  const [nomComplet, setNomComplet] = useState('');
  const [role, setRole] = useState('vendeur');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !nomComplet.trim()) {
      setError('Le nom et l’email sont requis');
      return;
    }

    setSaving(true);
    try {
      const invitation = await createInvitation({
        email: email.trim().toLowerCase(),
        role,
        nomComplet: nomComplet.trim(),
      });
      onSaved(invitation);
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
          <h2>Inviter un membre</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            <LuX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal__body stacked-form">
            {error && <div className="page-error">{error}</div>}

            <label className="field">
              <span>Nom complet *</span>
              <input type="text" value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} required />
            </label>

            <label className="field">
              <span>Email *</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <span className="field__hint">Doit correspondre à l'adresse utilisée lors de l'inscription.</span>
            </label>

            <label className="field">
              <span>Rôle *</span>
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                {INVITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving && <LuLoaderCircle className="spin" />}
              {saving ? 'Création...' : "Créer l'invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
