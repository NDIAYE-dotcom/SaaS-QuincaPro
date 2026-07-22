import { useLanguage } from '../../contexts/LanguageContext';
import './JournalTab.css';

export default function JournalTab({ entries }) {
  const { t } = useLanguage();
  const ORIGINE_LABELS = {
    manuelle: t('accounting.originManual'),
    vente: t('accounting.originSale'),
    achat: t('accounting.originPurchase'),
    paiement_vente: t('accounting.originSalePayment'),
    paiement_achat: t('accounting.originPurchasePayment'),
    annulation_vente: t('accounting.originSaleCancellation'),
    annulation_achat: t('accounting.originPurchaseCancellation'),
  };

  if (entries.length === 0) {
    return (
      <div className="page-empty">
        <p>{t('accounting.noEntriesYet')}</p>
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
                  <th>{t('accounting.columnAccount')}</th>
                  <th>{t('accounting.columnDebit')}</th>
                  <th>{t('accounting.columnCredit')}</th>
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
