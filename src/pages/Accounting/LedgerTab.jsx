import { useMemo, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import './LedgerTab.css';

export default function LedgerTab({ lines, accounts }) {
  const { t } = useLanguage();
  const [compteId, setCompteId] = useState(accounts[0]?.id || '');

  const compteLines = useMemo(() => {
    let solde = 0;
    return lines
      .filter((l) => l.compte?.id === compteId)
      .map((l) => {
        solde += Number(l.debit) - Number(l.credit);
        return { ...l, soldeCumule: solde };
      });
  }, [lines, compteId]);

  return (
    <div className="accounting__ledger">
      <label className="field accounting__ledger-select">
        <span>{t('accounting.account')}</span>
        <select value={compteId} onChange={(e) => setCompteId(e.target.value)}>
          {accounts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.numero} — {c.nom}
            </option>
          ))}
        </select>
      </label>

      {compteLines.length === 0 ? (
        <div className="page-empty">
          <p>{t('accounting.noMovementsOnAccount')}</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('accounting.columnDate')}</th>
                <th>{t('accounting.columnEntry')}</th>
                <th>{t('accounting.columnLabel')}</th>
                <th>{t('accounting.columnDebit')}</th>
                <th>{t('accounting.columnCredit')}</th>
                <th>{t('accounting.columnRunningBalance')}</th>
              </tr>
            </thead>
            <tbody>
              {compteLines.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.ecriture.date_ecriture).toLocaleDateString('fr-FR')}</td>
                  <td>{l.ecriture.numero}</td>
                  <td>{l.libelle || l.ecriture.libelle}</td>
                  <td>{l.debit > 0 ? `${Number(l.debit).toLocaleString('fr-FR')} FCFA` : ''}</td>
                  <td>{l.credit > 0 ? `${Number(l.credit).toLocaleString('fr-FR')} FCFA` : ''}</td>
                  <td>{l.soldeCumule.toLocaleString('fr-FR')} FCFA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
