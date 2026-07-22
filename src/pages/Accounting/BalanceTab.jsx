import { useLanguage } from '../../contexts/LanguageContext';
import './BalanceTab.css';

export default function BalanceTab({ balance }) {
  const { t } = useLanguage();
  const NATURE_LABELS = {
    actif: t('accounting.natureActif'),
    passif: t('accounting.naturePassif'),
    charge: t('accounting.natureCharge'),
    produit: t('accounting.natureProduit'),
  };
  const totalDebit = balance.reduce((sum, c) => sum + Number(c.total_debit), 0);
  const totalCredit = balance.reduce((sum, c) => sum + Number(c.total_credit), 0);

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('accounting.columnAccount')}</th>
            <th>{t('accounting.columnNature')}</th>
            <th>{t('accounting.columnTotalDebit')}</th>
            <th>{t('accounting.columnTotalCredit')}</th>
            <th>{t('accounting.columnBalance')}</th>
          </tr>
        </thead>
        <tbody>
          {balance.map((c) => (
            <tr key={c.compte_id}>
              <td className="data-table__title">
                {c.numero} — {c.nom}
              </td>
              <td>{NATURE_LABELS[c.nature]}</td>
              <td>{Number(c.total_debit).toLocaleString('fr-FR')} FCFA</td>
              <td>{Number(c.total_credit).toLocaleString('fr-FR')} FCFA</td>
              <td>{Number(c.solde).toLocaleString('fr-FR')} FCFA</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="data-table__title">{t('accounting.total')}</td>
            <td></td>
            <td className="data-table__title">{totalDebit.toLocaleString('fr-FR')} FCFA</td>
            <td className="data-table__title">{totalCredit.toLocaleString('fr-FR')} FCFA</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
