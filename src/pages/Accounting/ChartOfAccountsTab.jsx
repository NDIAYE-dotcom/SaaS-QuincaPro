import { useState } from 'react';
import { LuPlus } from 'react-icons/lu';
import { createAccount } from '../../services/accountingService';
import './ChartOfAccountsTab.css';

const NATURE_OPTIONS = [
  { value: 'actif', label: 'Actif' },
  { value: 'passif', label: 'Passif' },
  { value: 'charge', label: 'Charge' },
  { value: 'produit', label: 'Produit' },
];
const NATURE_LABELS = { actif: 'Actif', passif: 'Passif', charge: 'Charge', produit: 'Produit' };

export default function ChartOfAccountsTab({ accounts, onChanged }) {
  const [numero, setNumero] = useState('');
  const [nom, setNom] = useState('');
  const [nature, setNature] = useState('charge');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');

    if (!numero.trim() || !nom.trim()) {
      setError('Numéro et nom sont requis');
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
          placeholder="Numéro (ex: 622)"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
        />
        <input type="text" placeholder="Nom du compte" value={nom} onChange={(e) => setNom(e.target.value)} />
        <select value={nature} onChange={(e) => setNature(e.target.value)}>
          {NATURE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          <LuPlus /> Ajouter
        </button>
      </form>

      {error && <div className="page-error">{error}</div>}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Nom</th>
              <th>Nature</th>
              <th>Type</th>
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
                    <span className="badge badge--warning">Système</span>
                  ) : (
                    <span className="badge badge--success">Personnalisé</span>
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
