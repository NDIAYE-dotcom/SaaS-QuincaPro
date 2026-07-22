import { useState } from 'react';
import { LuX, LuLoaderCircle } from 'react-icons/lu';
import { createSupplier, updateSupplier } from '../../services/supplierService';
import { useLanguage } from '../../contexts/LanguageContext';
import './SupplierFormModal.css';

const EMPTY_FORM = {
  nom: '',
  contact_nom: '',
  telephone: '',
  whatsapp: '',
  email: '',
  adresse: '',
  notes: '',
};

function toFormState(supplier) {
  if (!supplier) return EMPTY_FORM;
  return {
    nom: supplier.nom || '',
    contact_nom: supplier.contact_nom || '',
    telephone: supplier.telephone || '',
    whatsapp: supplier.whatsapp || '',
    email: supplier.email || '',
    adresse: supplier.adresse || '',
    notes: supplier.notes || '',
  };
}

export default function SupplierFormModal({ supplier, onClose, onSaved }) {
  const { t } = useLanguage();
  const isEditing = Boolean(supplier);
  const [form, setForm] = useState(() => toFormState(supplier));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.nom.trim()) {
      setError(t('suppliers.errorNameRequired'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nom: form.nom.trim(),
        contact_nom: form.contact_nom.trim() || null,
        telephone: form.telephone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        adresse: form.adresse.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (isEditing) {
        await updateSupplier(supplier.id, payload);
      } else {
        await createSupplier(payload);
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
          <h2>{isEditing ? t('suppliers.editSupplierTitle') : t('suppliers.newSupplierTitle')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>
            <LuX />
          </button>
        </div>

        <form className="modal__body stacked-form" onSubmit={handleSubmit}>
          {error && <div className="page-error">{error}</div>}

          <div className="form-grid">
            <label className="field">
              <span>{t('suppliers.fieldName')}</span>
              <input type="text" value={form.nom} onChange={update('nom')} required />
            </label>

            <label className="field">
              <span>{t('suppliers.fieldContactName')}</span>
              <input type="text" value={form.contact_nom} onChange={update('contact_nom')} />
            </label>

            <label className="field">
              <span>{t('suppliers.fieldPhone')}</span>
              <input type="tel" value={form.telephone} onChange={update('telephone')} placeholder="77 123 45 67" />
            </label>

            <label className="field">
              <span>{t('suppliers.fieldWhatsapp')}</span>
              <input type="tel" value={form.whatsapp} onChange={update('whatsapp')} placeholder="77 123 45 67" />
            </label>

            <label className="field">
              <span>{t('suppliers.fieldEmail')}</span>
              <input type="email" value={form.email} onChange={update('email')} />
            </label>
          </div>

          <label className="field">
            <span>{t('suppliers.fieldAddress')}</span>
            <input type="text" value={form.adresse} onChange={update('adresse')} />
          </label>

          <label className="field">
            <span>{t('suppliers.fieldNotes')}</span>
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
