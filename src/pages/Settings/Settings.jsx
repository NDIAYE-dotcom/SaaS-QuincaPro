import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LuUpload, LuLoaderCircle } from 'react-icons/lu';
import { useAuth } from '../../contexts/AuthContext';
import { updateEntreprise } from '../../services/settingsService';
import { uploadEntrepriseLogo, uploadEntrepriseCachet, uploadEntrepriseSignature } from '../../services/storageService';
import PaydunyaCheckoutButton from '../../components/PaydunyaCheckoutButton';
import './Settings.css';

const STATUT_LABELS = {
  en_attente_paiement: 'En attente de paiement',
  actif: 'Actif',
  expire: 'Expiré',
  suspendu: 'Suspendu',
};

const STATUT_BADGE = {
  en_attente_paiement: 'badge--warning',
  actif: 'badge--success',
  expire: 'badge--danger',
  suspendu: 'badge--danger',
};

function toFormState(entreprise) {
  return {
    nom: entreprise?.nom || '',
    adresse: entreprise?.adresse || '',
    ninea: entreprise?.ninea || '',
    rccm: entreprise?.rccm || '',
    telephone: entreprise?.telephone || '',
    email: entreprise?.email || '',
    tva_numero: entreprise?.tva_numero || '',
    devise: entreprise?.devise || 'FCFA',
    langue: entreprise?.langue || 'fr',
  };
}

const ASSET_CONFIG = {
  logo: { label: 'Logo', field: 'logo_url', upload: uploadEntrepriseLogo },
  cachet: { label: 'Cachet', field: 'cachet_url', upload: uploadEntrepriseCachet },
  signature: { label: 'Signature', field: 'signature_url', upload: uploadEntrepriseSignature },
};

function toAssetState(entreprise) {
  return Object.fromEntries(
    Object.entries(ASSET_CONFIG).map(([key, { field }]) => [key, { preview: entreprise?.[field] || null, file: null }]),
  );
}

export default function Settings() {
  const { entreprise, profile, refreshProfile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const [form, setForm] = useState(() => toFormState(entreprise));
  const [assets, setAssets] = useState(() => toAssetState(entreprise));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const paymentReturn = searchParams.get('abonnement');

  useEffect(() => {
    if (!paymentReturn) return;
    if (paymentReturn === 'succes') refreshProfile();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('abonnement');
      return next;
    });
  }, [paymentReturn]);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleAssetChange(key) {
    return (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAssets((prev) => ({ ...prev, [key]: { file, preview: URL.createObjectURL(file) } }));
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!form.nom.trim()) {
      setError("Le nom de l'entreprise est requis");
      return;
    }

    setSaving(true);
    try {
      const assetUrls = {};
      for (const [key, { field, upload }] of Object.entries(ASSET_CONFIG)) {
        assetUrls[field] = assets[key].file ? await upload(entreprise.id, assets[key].file) : entreprise?.[field] || null;
      }

      await updateEntreprise(entreprise.id, {
        nom: form.nom.trim(),
        adresse: form.adresse.trim() || null,
        ninea: form.ninea.trim() || null,
        rccm: form.rccm.trim() || null,
        telephone: form.telephone.trim() || null,
        email: form.email.trim() || null,
        tva_numero: form.tva_numero.trim() || null,
        devise: form.devise,
        langue: form.langue,
        ...assetUrls,
      });

      await refreshProfile();
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings">
      <div className="page-header">
        <div>
          <h1>Paramètres</h1>
          <p>Informations de votre entreprise</p>
        </div>
        <div className="settings__subscription">
          <span className={`badge ${STATUT_BADGE[entreprise?.statut_abonnement]}`}>
            Abonnement {STATUT_LABELS[entreprise?.statut_abonnement]}
          </span>
          {entreprise?.date_expiration_abonnement && (
            <span className="field__hint">
              Valide jusqu'au{' '}
              {new Date(entreprise.date_expiration_abonnement).toLocaleDateString('fr-FR')}
            </span>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="page-error">Seul un administrateur peut modifier les paramètres de l'entreprise.</div>
      )}

      {paymentReturn === 'succes' && (
        <div className="settings__success">
          Paiement reçu ! Si le statut ci-dessus n'affiche pas encore "Actif", patientez quelques
          secondes puis rafraîchissez la page.
        </div>
      )}
      {paymentReturn === 'annule' && <div className="page-error">Paiement annulé.</div>}

      {error && <div className="page-error">{error}</div>}
      {success && <div className="settings__success">Paramètres enregistrés.</div>}

      {isAdmin && (
        <div className="settings__card">
          <h2 className="settings__card-title">Renouveler l'abonnement</h2>
          <p className="field__hint">5500 FCFA / mois. Le paiement prolonge la date d'expiration actuelle.</p>
          <PaydunyaCheckoutButton />
        </div>
      )}

      <form className="settings__card stacked-form" onSubmit={handleSubmit}>
        <div className="settings__logo">
          {Object.entries(ASSET_CONFIG).map(([key, { label }]) => (
            <div className="settings__logo-item" key={key}>
              <label
                htmlFor={`${key}-input`}
                className={`settings__logo-drop ${!isAdmin ? 'settings__logo-drop--disabled' : ''}`}
              >
                {assets[key].preview ? (
                  <img src={assets[key].preview} alt={label} />
                ) : (
                  <span>
                    <LuUpload /> {label}
                  </span>
                )}
              </label>
              <input
                id={`${key}-input`}
                type="file"
                accept="image/*"
                onChange={handleAssetChange(key)}
                disabled={!isAdmin}
                hidden
              />
              <small className="field__hint">{label}</small>
            </div>
          ))}
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Nom de l'entreprise *</span>
            <input type="text" value={form.nom} onChange={update('nom')} required disabled={!isAdmin} />
          </label>

          <label className="field">
            <span>Téléphone</span>
            <input type="tel" value={form.telephone} onChange={update('telephone')} disabled={!isAdmin} />
          </label>

          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={update('email')} disabled={!isAdmin} />
          </label>

          <label className="field">
            <span>NINEA</span>
            <input type="text" value={form.ninea} onChange={update('ninea')} disabled={!isAdmin} />
          </label>

          <label className="field">
            <span>RCCM</span>
            <input type="text" value={form.rccm} onChange={update('rccm')} disabled={!isAdmin} />
          </label>

          <label className="field">
            <span>Numéro TVA</span>
            <input type="text" value={form.tva_numero} onChange={update('tva_numero')} disabled={!isAdmin} />
          </label>

          <label className="field">
            <span>Devise</span>
            <select value={form.devise} onChange={update('devise')} disabled={!isAdmin}>
              <option value="FCFA">FCFA (XOF)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">Dollar (USD)</option>
            </select>
          </label>

          <label className="field">
            <span>Langue</span>
            <select value={form.langue} onChange={update('langue')} disabled={!isAdmin}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
            {form.langue === 'en' && (
              <small className="field__hint">
                La traduction anglaise de l'interface n'est pas encore disponible.
              </small>
            )}
          </label>
        </div>

        <label className="field">
          <span>Adresse</span>
          <input type="text" value={form.adresse} onChange={update('adresse')} disabled={!isAdmin} />
        </label>

        {isAdmin && (
          <div className="modal__footer settings__footer">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving && <LuLoaderCircle className="spin" />}
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
