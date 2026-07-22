import { useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { createClient, updateClient } from '../../services/clientService';
import { useLanguage } from '../../contexts/LanguageContext';
import './ClientFormModal.css';

const EMPTY_FORM = {
  nom: '',
  telephone: '',
  whatsapp: '',
  email: '',
  adresse: '',
  limite_credit: '0',
  notes: '',
};

function toFormState(client) {
  if (!client) return EMPTY_FORM;
  return {
    nom: client.nom || '',
    telephone: client.telephone || '',
    whatsapp: client.whatsapp || '',
    email: client.email || '',
    adresse: client.adresse || '',
    limite_credit: String(client.limite_credit ?? '0'),
    notes: client.notes || '',
  };
}

export default function ClientFormModal({ client, onClose, onSaved }) {
  const { t } = useLanguage();
  const isEditing = Boolean(client);
  const [form, setForm] = useState(() => toFormState(client));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.nom.trim()) {
      setError(t('clients.errorNameRequired'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nom: form.nom.trim(),
        telephone: form.telephone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        adresse: form.adresse.trim() || null,
        limite_credit: Number(form.limite_credit) || 0,
        notes: form.notes.trim() || null,
      };

      if (isEditing) {
        await updateClient(client.id, payload);
      } else {
        await createClient(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{isEditing ? t('clients.editClientTitle') : t('clients.newClientTitle')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <LuX />
          </button>
        </div>

        <form className="modal__body stacked-form" onSubmit={handleSubmit}>
          {error && <div className="page-error">{error}</div>}

          <div className="form-grid">
            <label className="field">
              <span>{t('clients.fieldName')}</span>
              <input type="text" value={form.nom} onChange={update('nom')} required />
            </label>

            <label className="field">
              <span>{t('clients.fieldPhone')}</span>
              <input type="tel" value={form.telephone} onChange={update('telephone')} placeholder="77 123 45 67" />
            </label>

            <label className="field">
              <span>{t('clients.fieldWhatsapp')}</span>
              <input type="tel" value={form.whatsapp} onChange={update('whatsapp')} placeholder="77 123 45 67" />
            </label>

            <label className="field">
              <span>{t('clients.fieldEmail')}</span>
              <input type="email" value={form.email} onChange={update('email')} />
            </label>

            <label className="field">
              <span>{t('clients.fieldCreditLimit')}</span>
              <input type="number" min="0" step="0.01" value={form.limite_credit} onChange={update('limite_credit')} />
            </label>
          </div>

          <label className="field">
            <span>{t('clients.fieldAddress')}</span>
            <input type="text" value={form.adresse} onChange={update('adresse')} />
          </label>

          <label className="field">
            <span>{t('clients.fieldNotes')}</span>
            <textarea rows={3} value={form.notes} onChange={update('notes')} />
          </label>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving && <LuLoaderCircle className="spin" />}
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
