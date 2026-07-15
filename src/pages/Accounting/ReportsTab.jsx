import './ReportsTab.css';

export default function ReportsTab({ balance }) {
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
        <h2 className="section-title">Compte de résultat</h2>

        <div className="accounting__report-section">
          <h3>Charges</h3>
          {charges.length === 0 ? (
            <p className="accounting__report-empty">Aucune charge enregistrée</p>
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
            <span>Total charges</span>
            <span>{totalCharges.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        <div className="accounting__report-section">
          <h3>Produits</h3>
          {produits.length === 0 ? (
            <p className="accounting__report-empty">Aucun produit enregistré</p>
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
            <span>Total produits</span>
            <span>{totalProduits.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        <div className="accounting__report-row accounting__report-row--result">
          <span>Résultat net</span>
          <span>{resultatNet.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>

      <div className="accounting__report-card">
        <h2 className="section-title">Bilan</h2>

        <div className="accounting__report-section">
          <h3>Actif</h3>
          {actifs.length === 0 ? (
            <p className="accounting__report-empty">Aucun compte d'actif mouvementé</p>
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
            <span>Total actif</span>
            <span>{totalActif.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        <div className="accounting__report-section">
          <h3>Passif</h3>
          {passifs.length === 0 ? (
            <p className="accounting__report-empty">Aucun compte de passif mouvementé</p>
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
            <span>Total passif</span>
            <span>{totalPassif.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
