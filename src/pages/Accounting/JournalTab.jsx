import './JournalTab.css';

const ORIGINE_LABELS = {
  manuelle: 'Manuelle',
  vente: 'Vente',
  achat: 'Achat',
  paiement_vente: 'Paiement vente',
  paiement_achat: 'Paiement achat',
  annulation_vente: 'Annulation vente',
  annulation_achat: 'Annulation achat',
};

export default function JournalTab({ entries }) {
  if (entries.length === 0) {
    return (
      <div className="page-empty">
        <p>Aucune écriture pour l'instant.</p>
      </div>
    );
  }

  return (
    <div className="accounting__entries">
      {entries.map((entry) => (
        <div key={entry.id} className="accounting__entry-card">
          <div className="accounting__entry-header">
            <div>
              <span className="data-table__title">{entry.numero}</span>
              <span className="accounting__entry-libelle">{entry.libelle}</span>
            </div>
            <div className="accounting__entry-meta">
              <span className="badge badge--warning">{ORIGINE_LABELS[entry.origine] || entry.origine}</span>
              <span>{new Date(entry.date_ecriture).toLocaleDateString('fr-FR')}</span>
            </div>
          </div>

          <div className="accounting__entry-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Compte</th>
                  <th>Débit</th>
                  <th>Crédit</th>
                </tr>
              </thead>
              <tbody>
                {entry.lignes.map((ligne) => (
                  <tr key={ligne.id}>
                    <td>
                      {ligne.compte?.numero} — {ligne.compte?.nom}
                    </td>
                    <td>{ligne.debit > 0 ? `${Number(ligne.debit).toLocaleString('fr-FR')} FCFA` : ''}</td>
                    <td>{ligne.credit > 0 ? `${Number(ligne.credit).toLocaleString('fr-FR')} FCFA` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
