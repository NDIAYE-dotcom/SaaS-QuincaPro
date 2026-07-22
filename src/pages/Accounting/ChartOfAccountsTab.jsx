import { useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { createAccount } from '../../services/accountingService';
import { useLanguage } from '../../contexts/LanguageContext';
import './ChartOfAccountsTab.css';

export default function ChartOfAccountsTab({ accounts, onChanged }) {
  const { t } = useLanguage();
  const NATURE_LABELS = {
    actif: t('accounting.natureActif'),
    passif: t('accounting.naturePassif'),
    charge: t('accounting.natureCharge'),
    produit: t('accounting.natureProduit'),
  };
  const NATURE_OPTIONS = [
    { value: 'actif', label: NATURE_LABELS.actif },
    { value: 'passif', label: NATURE_LABELS.passif },
    { value: 'charge', label: NATURE_LABELS.charge },
    { value: 'produit', label: NATURE_LABELS.produit },
  ];
  const [numero, setNumero] = useState('');
  const [nom, setNom] = useState('');
  const [nature, setNature] = useState('charge');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');

    if (!numero.trim() || !nom.trim()) {
      setError(t('accounting.errorNumberNameRequired'));
      return;
    }

    setSaving(true);
    try {
      await createAccount({ numero: numero.trim(), nom: nom.trim(), nature });
      setNumero('');
      setNom('');
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="accounting__chart">
      <form className="accounting__chart-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder={t('accounting.numberPlaceholder')}
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />
        <input
          type="text"
          placeholder={t('accounting.accountNamePlaceholder')}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <select value={nature} onChange={(e) => setNature(e.target.value)}>
          {NATURE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          <LuPlus /> {t('accounting.add')}
        </button>
      </form>

      {error && <div className="page-error">{error}</div>}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('accounting.columnNumber')}</th>
              <th>{t('accounting.columnName')}</th>
              <th>{t('accounting.columnNature')}</th>
              <th>{t('accounting.columnType')}</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((c) => (
              <tr key={c.id}>
                <td className="data-table__title">{c.numero}</td>
                <td>{c.nom}</td>
                <td>{NATURE_LABELS[c.nature]}</td>
                <td>
                  {c.code_systeme ? (
                    <span className="badge badge--warning">{t('accounting.system')}</span>
                  ) : (
                    <span className="badge badge--success">{t('accounting.custom')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
