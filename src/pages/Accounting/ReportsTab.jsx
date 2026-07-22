import { useLanguage } from '../../contexts/LanguageContext';
import './ReportsTab.css';

export default function ReportsTab({ balance }) {
  const { t } = useLanguage();
  const charges = balance.filter((c) => c.nature === 'charge' && (c.total_debit > 0 || c.total_credit > 0));
  const produits = balance.filter((c) => c.nature === 'produit' && (c.total_debit > 0 || c.total_credit > 0));
  const actifs = balance.filter((c) => c.nature === 'actif' && (c.total_debit > 0 || c.total_credit > 0));
  const passifs = balance.filter((c) => c.nature === 'passif' && (c.total_debit > 0 || c.total_credit > 0));

  const totalCharges = charges.reduce((sum, c) => sum + Number(c.solde), 0);
  const totalProduits = produits.reduce((sum, c) => sum + (Number(c.total_credit) - Number(c.total_debit)), 0);
  const resultatNet = totalProduits - totalCharges;

  const totalActif = actifs.reduce((sum, c) => sum + Number(c.solde), 0);
  const totalPassif = passifs.reduce((sum, c) => sum + (Number(c.total_credit) - Number(c.total_debit)), 0);

  return (
    <div className="accounting__reports">
      <div className="accounting__report-card">
        <h2 className="section-title">{t('accounting.incomeStatement')}</h2>

        <div className="accounting__report-section">
          <h3>{t('accounting.expenses')}</h3>
          {charges.length === 0 ? (
            <p className="accounting__report-empty">{t('accounting.noExpensesRecorded')}</p>
          ) : (
            charges.map((c) => (
              <div key={c.compte_id} className="accounting__report-row">
                <span>
                  {c.numero} — {c.nom}
                </span>
                <span>{Number(c.solde).toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))
          )}
          <div className="accounting__report-row accounting__report-row--total">
            <span>{t('accounting.totalExpenses')}</span>
            <span>{totalCharges.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        <div className="accounting__report-section">
          <h3>{t('accounting.revenue')}</h3>
          {produits.length === 0 ? (
            <p className="accounting__report-empty">{t('accounting.noRevenueRecorded')}</p>
          ) : (
            produits.map((c) => (
              <div key={c.compte_id} className="accounting__report-row">
                <span>
                  {c.numero} — {c.nom}
                </span>
                <span>{(Number(c.total_credit) - Number(c.total_debit)).toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))
          )}
          <div className="accounting__report-row accounting__report-row--total">
            <span>{t('accounting.totalRevenue')}</span>
            <span>{totalProduits.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        <div className="accounting__report-row accounting__report-row--result">
          <span>{t('accounting.netResult')}</span>
          <span>{resultatNet.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>

      <div className="accounting__report-card">
        <h2 className="section-title">{t('accounting.balanceSheet')}</h2>

        <div className="accounting__report-section">
          <h3>{t('accounting.assets')}</h3>
          {actifs.length === 0 ? (
            <p className="accounting__report-empty">{t('accounting.noAssetAccountsMoved')}</p>
          ) : (
            actifs.map((c) => (
              <div key={c.compte_id} className="accounting__report-row">
                <span>
                  {c.numero} — {c.nom}
                </span>
                <span>{Number(c.solde).toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))
          )}
          <div className="accounting__report-row accounting__report-row--total">
            <span>{t('accounting.totalAssets')}</span>
            <span>{totalActif.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        <div className="accounting__report-section">
          <h3>{t('accounting.liabilities')}</h3>
          {passifs.length === 0 ? (
            <p className="accounting__report-empty">{t('accounting.noLiabilityAccountsMoved')}</p>
          ) : (
            passifs.map((c) => (
              <div key={c.compte_id} className="accounting__report-row">
                <span>
                  {c.numero} — {c.nom}
                </span>
                <span>{(Number(c.total_credit) - Number(c.total_debit)).toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))
          )}
          <div className="accounting__report-row accounting__report-row--total">
            <span>{t('accounting.totalLiabilities')}</span>
            <span>{totalPassif.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
