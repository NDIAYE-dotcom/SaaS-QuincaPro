import {
  fetchVentesReport,
  fetchAchatsReport,
  fetchBeneficesReport,
  fetchStockReport,
  fetchProduitsReport,
  fetchTvaReport,
  fetchClientsReport,
  fetchFournisseursReport,
  fetchComptabiliteReport,
  fetchDettesReport,
} from '../../services/reportsService';

export const money = (v) => {
  const value = Number(v) || 0;
  const fixed = Math.abs(value).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  // Espace normale (U+0020) plutôt que le séparateur de toLocaleString('fr-FR') : les polices
  // standards de jsPDF (utilisées par l'export PDF des rapports) n'ont pas le glyphe de l'espace
  // fine insécable (U+202F) et l'affichent comme un caractère invalide ("/").
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decimalDisplay = decPart === '00' ? '' : `,${decPart}`;
  return `${value < 0 ? '-' : ''}${withSeparators}${decimalDisplay} FCFA`;
};
export const dateFmt = (v) => new Date(v).toLocaleDateString('fr-FR');
export const pct = (v) => `${Number(v || 0).toFixed(1)}%`;
const sum = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);

export function getReportTypes(t) {
  const PAIEMENT_LABELS = {
    impaye: t('common.paymentUnpaid'),
    partiel: t('common.paymentPartial'),
    paye: t('common.paymentPaid'),
  };

  return [
    {
      id: 'ventes',
      label: t('reports.typeSales'),
      needsDateRange: true,
      fetch: async (range) => fetchVentesReport(range, t),
      columns: [
        { key: 'numero', label: t('reports.colInvoice') },
        { key: 'date', label: t('reports.colDate'), format: dateFmt },
        { key: 'client', label: t('reports.colClient') },
        { key: 'total_ttc', label: t('reports.colTotalTtc'), format: money },
        { key: 'statut_paiement', label: t('reports.colPayment'), format: (v) => PAIEMENT_LABELS[v] || v },
      ],
      summary: (rows) => [
        { label: t('reports.summaryInvoiceCount'), value: rows.length },
        { label: t('reports.summaryRevenue'), value: money(sum(rows, 'total_ttc')) },
        { label: t('reports.summaryVatCollected'), value: money(sum(rows, 'total_tva')) },
      ],
    },
    {
      id: 'achats',
      label: t('reports.typePurchases'),
      needsDateRange: true,
      fetch: async (range) => fetchAchatsReport(range),
      columns: [
        { key: 'numero', label: t('reports.colPurchase') },
        { key: 'date', label: t('reports.colDate'), format: dateFmt },
        { key: 'fournisseur', label: t('reports.colSupplier') },
        { key: 'total_ttc', label: t('reports.colTotalTtc'), format: money },
        { key: 'statut_paiement', label: t('reports.colPayment'), format: (v) => PAIEMENT_LABELS[v] || v },
      ],
      summary: (rows) => [
        { label: t('reports.summaryPurchaseCount'), value: rows.length },
        { label: t('reports.summaryTotalPurchases'), value: money(sum(rows, 'total_ttc')) },
        { label: t('reports.summaryVatDeductible'), value: money(sum(rows, 'total_tva')) },
      ],
    },
    {
      id: 'benefices',
      label: t('reports.typeProfits'),
      needsDateRange: true,
      fetch: async (range) => fetchBeneficesReport(range),
      columns: [
        { key: 'numero', label: t('reports.colInvoice') },
        { key: 'date', label: t('reports.colDate'), format: dateFmt },
        { key: 'client', label: t('reports.colClient') },
        { key: 'ca_ht', label: t('reports.colRevenueExVat'), format: money },
        { key: 'cout', label: t('reports.colEstimatedCost'), format: money },
        { key: 'marge', label: t('reports.colMargin'), format: money },
        { key: 'marge_pourcentage', label: t('reports.colMarginPct'), format: pct },
      ],
      summary: (rows) => [
        { label: t('reports.summaryTotalRevenueExVat'), value: money(sum(rows, 'ca_ht')) },
        { label: t('reports.summaryTotalMargin'), value: money(sum(rows, 'marge')) },
        {
          label: t('reports.summaryAvgMargin'),
          value: pct(rows.length ? sum(rows, 'marge_pourcentage') / rows.length : 0),
        },
      ],
      note: t('reports.profitsNote'),
    },
    {
      id: 'stock',
      label: t('reports.typeStock'),
      needsDateRange: false,
      fetch: async () => fetchStockReport(t),
      columns: [
        { key: 'nom', label: t('reports.colProduct') },
        { key: 'sku', label: t('reports.colSku') },
        { key: 'quantite_stock', label: t('reports.colStock') },
        { key: 'stock_minimum', label: t('reports.colMinThreshold') },
        { key: 'valeur_stock', label: t('reports.colStockValue'), format: money },
        { key: 'statut', label: t('reports.colStatus') },
      ],
      summary: (rows) => [
        { label: t('reports.summaryTotalStockValue'), value: money(sum(rows, 'valeur_stock')) },
        {
          label: t('reports.summaryOutOfStockProducts'),
          value: rows.filter((r) => r.statut === t('common.stockOutOfStock')).length,
        },
        {
          label: t('reports.summaryLowStockProducts'),
          value: rows.filter((r) => r.statut === t('common.stockLow')).length,
        },
      ],
    },
    {
      id: 'produits',
      label: t('reports.typeProducts'),
      needsDateRange: false,
      fetch: async () => fetchProduitsReport(t),
      columns: [
        { key: 'nom', label: t('reports.colProduct') },
        { key: 'sku', label: t('reports.colSku') },
        { key: 'categorie', label: t('reports.colCategory') },
        { key: 'unite', label: t('reports.colUnit') },
        { key: 'prix_achat', label: t('reports.colBuyPrice'), format: money },
        { key: 'prix_vente', label: t('reports.colSellPrice'), format: money },
        { key: 'quantite_stock', label: t('reports.colStock') },
        { key: 'statut', label: t('reports.colStatus') },
      ],
      summary: (rows) => [{ label: t('reports.summaryProductCount'), value: rows.length }],
    },
    {
      id: 'tva',
      label: t('reports.typeVat'),
      needsDateRange: true,
      fetch: async (range) => {
        const { rows, summary } = await fetchTvaReport(range, t);
        return rows.map((r) => ({ ...r, __summary: summary }));
      },
      columns: [
        { key: 'numero', label: t('reports.colDocument') },
        { key: 'date', label: t('reports.colDate'), format: dateFmt },
        { key: 'type', label: t('reports.colType') },
        { key: 'montant_tva', label: t('reports.colVatAmount'), format: money },
      ],
      summary: (rows) => {
        const s = rows[0]?.__summary || { tvaCollectee: 0, tvaDeductible: 0, tvaNette: 0 };
        return [
          { label: t('reports.summaryVatCollectedSales'), value: money(s.tvaCollectee) },
          { label: t('reports.summaryVatDeductiblePurchases'), value: money(s.tvaDeductible) },
          { label: t('reports.summaryNetVat'), value: money(s.tvaNette) },
        ];
      },
    },
    {
      id: 'clients',
      label: t('reports.typeClients'),
      needsDateRange: true,
      fetch: async (range) => fetchClientsReport(range),
      columns: [
        { key: 'nom', label: t('reports.colClient') },
        { key: 'telephone', label: t('reports.colPhone') },
        { key: 'total_achats', label: t('reports.colTotalPurchasesPeriod'), format: money },
        { key: 'solde_dette', label: t('reports.colCurrentDebt'), format: money },
      ],
      summary: (rows) => [
        { label: t('reports.summaryClientCount'), value: rows.length },
        { label: t('reports.summaryTotalClientDebts'), value: money(sum(rows, 'solde_dette')) },
      ],
    },
    {
      id: 'fournisseurs',
      label: t('reports.typeSuppliers'),
      needsDateRange: true,
      fetch: async (range) => fetchFournisseursReport(range),
      columns: [
        { key: 'nom', label: t('reports.colSupplier') },
        { key: 'telephone', label: t('reports.colPhone') },
        { key: 'total_achats', label: t('reports.colTotalPurchasesPeriod'), format: money },
        { key: 'solde_dette', label: t('reports.colCurrentDebt'), format: money },
      ],
      summary: (rows) => [
        { label: t('reports.summarySupplierCount'), value: rows.length },
        { label: t('reports.summaryTotalSupplierDebts'), value: money(sum(rows, 'solde_dette')) },
      ],
    },
    {
      id: 'comptabilite',
      label: t('reports.typeAccountingResult'),
      needsDateRange: true,
      fetch: async (range) => {
        const { rows, summary } = await fetchComptabiliteReport(range, t);
        return rows.map((r) => ({ ...r, __summary: summary }));
      },
      columns: [
        { key: 'compte', label: t('reports.colAccount') },
        { key: 'montant', label: t('reports.colBalance'), format: money },
      ],
      summary: (rows) => {
        const s = rows[0]?.__summary || { produits: 0, charges: 0, resultat: 0 };
        return [
          { label: t('reports.summaryTotalRevenue'), value: money(s.produits) },
          { label: t('reports.summaryTotalExpenses'), value: money(s.charges) },
          { label: t('reports.summaryNetResult'), value: money(s.resultat) },
        ];
      },
    },
    {
      id: 'dettes',
      label: t('reports.typeDebts'),
      needsDateRange: false,
      fetch: async () => fetchDettesReport(t),
      columns: [
        { key: 'type', label: t('reports.colType') },
        { key: 'nom', label: t('reports.colName') },
        { key: 'telephone', label: t('reports.colPhone') },
        { key: 'montant', label: t('reports.colAmountDue'), format: money },
      ],
      summary: (rows) => [
        { label: t('reports.summaryDebtorCount'), value: rows.length },
        { label: t('reports.summaryTotalDebts'), value: money(sum(rows, 'montant')) },
      ],
    },
  ];
}
