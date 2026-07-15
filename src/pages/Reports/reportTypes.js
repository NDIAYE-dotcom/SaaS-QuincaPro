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

const PAIEMENT_LABELS = { impaye: 'Impayé', partiel: 'Partiel', paye: 'Payé' };

export const money = (v) => `${Number(v || 0).toLocaleString('fr-FR')} FCFA`;
export const dateFmt = (v) => new Date(v).toLocaleDateString('fr-FR');
export const pct = (v) => `${Number(v || 0).toFixed(1)}%`;
const sum = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);

export const REPORT_TYPES = [
  {
    id: 'ventes',
    label: 'Ventes',
    needsDateRange: true,
    fetch: async (range) => fetchVentesReport(range),
    columns: [
      { key: 'numero', label: 'Facture' },
      { key: 'date', label: 'Date', format: dateFmt },
      { key: 'client', label: 'Client' },
      { key: 'total_ttc', label: 'Total TTC', format: money },
      { key: 'statut_paiement', label: 'Paiement', format: (v) => PAIEMENT_LABELS[v] || v },
    ],
    summary: (rows) => [
      { label: 'Nombre de factures', value: rows.length },
      { label: "Chiffre d'affaires", value: money(sum(rows, 'total_ttc')) },
      { label: 'TVA collectée', value: money(sum(rows, 'total_tva')) },
    ],
  },
  {
    id: 'achats',
    label: 'Achats',
    needsDateRange: true,
    fetch: async (range) => fetchAchatsReport(range),
    columns: [
      { key: 'numero', label: 'Achat' },
      { key: 'date', label: 'Date', format: dateFmt },
      { key: 'fournisseur', label: 'Fournisseur' },
      { key: 'total_ttc', label: 'Total TTC', format: money },
      { key: 'statut_paiement', label: 'Paiement', format: (v) => PAIEMENT_LABELS[v] || v },
    ],
    summary: (rows) => [
      { label: "Nombre d'achats", value: rows.length },
      { label: 'Total achats', value: money(sum(rows, 'total_ttc')) },
      { label: 'TVA déductible', value: money(sum(rows, 'total_tva')) },
    ],
  },
  {
    id: 'benefices',
    label: 'Bénéfices',
    needsDateRange: true,
    fetch: async (range) => fetchBeneficesReport(range),
    columns: [
      { key: 'numero', label: 'Facture' },
      { key: 'date', label: 'Date', format: dateFmt },
      { key: 'client', label: 'Client' },
      { key: 'ca_ht', label: 'CA HT', format: money },
      { key: 'cout', label: 'Coût estimé', format: money },
      { key: 'marge', label: 'Marge', format: money },
      { key: 'marge_pourcentage', label: 'Marge %', format: pct },
    ],
    summary: (rows) => [
      { label: 'CA HT total', value: money(sum(rows, 'ca_ht')) },
      { label: 'Marge totale', value: money(sum(rows, 'marge')) },
      {
        label: 'Marge moyenne',
        value: pct(rows.length ? sum(rows, 'marge_pourcentage') / rows.length : 0),
      },
    ],
    note: "Marge estimée à partir du prix d'achat actuel des produits (non historisé au moment de la vente).",
  },
  {
    id: 'stock',
    label: 'Stock',
    needsDateRange: false,
    fetch: async () => fetchStockReport(),
    columns: [
      { key: 'nom', label: 'Produit' },
      { key: 'sku', label: 'SKU' },
      { key: 'quantite_stock', label: 'Stock' },
      { key: 'stock_minimum', label: 'Seuil min.' },
      { key: 'valeur_stock', label: 'Valeur (coût)', format: money },
      { key: 'statut', label: 'Statut' },
    ],
    summary: (rows) => [
      { label: 'Valeur totale du stock', value: money(sum(rows, 'valeur_stock')) },
      { label: 'Produits en rupture', value: rows.filter((r) => r.statut === 'Rupture').length },
      { label: 'Produits en stock faible', value: rows.filter((r) => r.statut === 'Faible').length },
    ],
  },
  {
    id: 'produits',
    label: 'Produits',
    needsDateRange: false,
    fetch: async () => fetchProduitsReport(),
    columns: [
      { key: 'nom', label: 'Produit' },
      { key: 'sku', label: 'SKU' },
      { key: 'categorie', label: 'Catégorie' },
      { key: 'unite', label: 'Unité' },
      { key: 'prix_achat', label: 'Prix achat', format: money },
      { key: 'prix_vente', label: 'Prix vente', format: money },
      { key: 'quantite_stock', label: 'Stock' },
      { key: 'statut', label: 'Statut' },
    ],
    summary: (rows) => [{ label: 'Nombre de produits', value: rows.length }],
  },
  {
    id: 'tva',
    label: 'TVA',
    needsDateRange: true,
    fetch: async (range) => {
      const { rows, summary } = await fetchTvaReport(range);
      return rows.map((r) => ({ ...r, __summary: summary }));
    },
    columns: [
      { key: 'numero', label: 'Document' },
      { key: 'date', label: 'Date', format: dateFmt },
      { key: 'type', label: 'Type' },
      { key: 'montant_tva', label: 'Montant TVA', format: money },
    ],
    summary: (rows) => {
      const s = rows[0]?.__summary || { tvaCollectee: 0, tvaDeductible: 0, tvaNette: 0 };
      return [
        { label: 'TVA collectée (ventes)', value: money(s.tvaCollectee) },
        { label: 'TVA déductible (achats)', value: money(s.tvaDeductible) },
        { label: 'TVA nette', value: money(s.tvaNette) },
      ];
    },
  },
  {
    id: 'clients',
    label: 'Clients',
    needsDateRange: true,
    fetch: async (range) => fetchClientsReport(range),
    columns: [
      { key: 'nom', label: 'Client' },
      { key: 'telephone', label: 'Téléphone' },
      { key: 'total_achats', label: 'Total achats (période)', format: money },
      { key: 'solde_dette', label: 'Dette actuelle', format: money },
    ],
    summary: (rows) => [
      { label: 'Nombre de clients', value: rows.length },
      { label: 'Total dettes clients', value: money(sum(rows, 'solde_dette')) },
    ],
  },
  {
    id: 'fournisseurs',
    label: 'Fournisseurs',
    needsDateRange: true,
    fetch: async (range) => fetchFournisseursReport(range),
    columns: [
      { key: 'nom', label: 'Fournisseur' },
      { key: 'telephone', label: 'Téléphone' },
      { key: 'total_achats', label: 'Total achats (période)', format: money },
      { key: 'solde_dette', label: 'Dette actuelle', format: money },
    ],
    summary: (rows) => [
      { label: 'Nombre de fournisseurs', value: rows.length },
      { label: 'Total dettes fournisseurs', value: money(sum(rows, 'solde_dette')) },
    ],
  },
  {
    id: 'comptabilite',
    label: 'Comptabilité (Résultat)',
    needsDateRange: true,
    fetch: async (range) => {
      const { rows, summary } = await fetchComptabiliteReport(range);
      return rows.map((r) => ({ ...r, __summary: summary }));
    },
    columns: [
      { key: 'compte', label: 'Compte' },
      { key: 'montant', label: 'Solde', format: money },
    ],
    summary: (rows) => {
      const s = rows[0]?.__summary || { produits: 0, charges: 0, resultat: 0 };
      return [
        { label: 'Total produits', value: money(s.produits) },
        { label: 'Total charges', value: money(s.charges) },
        { label: 'Résultat net', value: money(s.resultat) },
      ];
    },
  },
  {
    id: 'dettes',
    label: 'Dettes',
    needsDateRange: false,
    fetch: async () => fetchDettesReport(),
    columns: [
      { key: 'type', label: 'Type' },
      { key: 'nom', label: 'Nom' },
      { key: 'telephone', label: 'Téléphone' },
      { key: 'montant', label: 'Montant dû', format: money },
    ],
    summary: (rows) => [
      { label: 'Nombre de débiteurs', value: rows.length },
      { label: 'Total dettes', value: money(sum(rows, 'montant')) },
    ],
  },
];
