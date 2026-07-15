import './BalanceTab.css';

const NATURE_LABELS = { actif: 'Actif', passif: 'Passif', charge: 'Charge', produit: 'Produit' };

export default function BalanceTab({ balance }) {
  const totalDebit = balance.reduce((sum, c) => sum + Number(c.total_debit), 0);
  const totalCredit = balance.reduce((sum, c) => sum + Number(c.total_credit), 0);

  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Compte</th>
            <th>Nature</th>
            <th>Total débit</th>
            <th>Total crédit</th>
            <th>Solde</th>
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
            <td className="data-table__title">Total</td>
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
