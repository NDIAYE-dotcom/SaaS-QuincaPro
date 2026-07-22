import { fetchCategories, createCategory } from './categoryService';
import { createProduct } from './productService';
import { registerStockMovement } from './stockService';

export const TEMPLATE_COLUMNS = [
  { key: 'nom', label: 'Nom' },
  { key: 'categorie', label: 'Catégorie' },
  { key: 'marque', label: 'Marque' },
  { key: 'unite', label: 'Unité' },
  { key: 'sku', label: 'SKU' },
  { key: 'code_barre', label: 'Code-barre' },
  { key: 'prix_achat', label: "Prix d'achat" },
  { key: 'prix_vente', label: 'Prix de vente' },
  { key: 'taux_tva', label: 'TVA (%)' },
  { key: 'stock_minimum', label: 'Stock minimum' },
  { key: 'stock_initial', label: 'Stock initial' },
];

const EXAMPLE_ROW = {
  Nom: 'Marteau menuisier 500g',
  Catégorie: 'Outillage',
  Marque: 'Stanley',
  Unité: 'Pièce',
  SKU: 'MRT-500',
  'Code-barre': '',
  "Prix d'achat": 2500,
  'Prix de vente': 3500,
  'TVA (%)': 0,
  'Stock minimum': 5,
  'Stock initial': 20,
};

function normalizeHeader(str) {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const HEADER_TO_KEY = new Map(TEMPLATE_COLUMNS.map((c) => [normalizeHeader(c.label), c.key]));

export async function downloadProductImportTemplate() {
  const { exportToExcel } = await import('../utils/exportUtils');
  await exportToExcel(
    'modele-import-produits.xlsx',
    TEMPLATE_COLUMNS.map((c) => ({ key: c.label, label: c.label })),
    [EXAMPLE_ROW],
    'Produits',
  );
}

export async function parseProductImportFile(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

  if (rows.length === 0) return [];

  const headerRow = rows[0].map(normalizeHeader);
  const keyByColumnIndex = headerRow.map((h) => HEADER_TO_KEY.get(h) || null);

  return rows
    .slice(1)
    .map((row) => {
      const record = {};
      keyByColumnIndex.forEach((key, index) => {
        if (key) record[key] = row[index];
      });
      return record;
    })
    .filter((record) => Object.values(record).some((v) => String(v ?? '').trim() !== ''));
}

export function validateImportRow(record) {
  const errors = [];

  const nom = String(record.nom ?? '').trim();
  if (!nom) errors.push('Nom manquant');

  const prixVente = Number(record.prix_vente);
  if (record.prix_vente === '' || record.prix_vente == null || Number.isNaN(prixVente) || prixVente < 0) {
    errors.push('Prix de vente invalide');
  }

  const toNumberOrZero = (v) => {
    const n = Number(v);
    return v === '' || v == null || Number.isNaN(n) ? 0 : n;
  };

  const data = {
    nom,
    categorie: String(record.categorie ?? '').trim(),
    marque: String(record.marque ?? '').trim() || null,
    unite: String(record.unite ?? '').trim() || 'Pièce',
    sku: String(record.sku ?? '').trim() || null,
    code_barre: String(record.code_barre ?? '').trim() || null,
    prix_achat: toNumberOrZero(record.prix_achat),
    prix_vente: prixVente,
    taux_tva: toNumberOrZero(record.taux_tva),
    stock_minimum: toNumberOrZero(record.stock_minimum),
    stock_initial: toNumberOrZero(record.stock_initial),
  };

  return { data, errors };
}

export async function importProducts(validRows, { onProgress } = {}) {
  const categories = await fetchCategories();
  const categoryIdByName = new Map(
    categories.filter((c) => !c.parent_id).map((c) => [normalizeHeader(c.nom), c.id]),
  );

  const results = [];

  for (let i = 0; i < validRows.length; i += 1) {
    const row = validRows[i];
    try {
      let categorieId = null;
      if (row.categorie) {
        const key = normalizeHeader(row.categorie);
        categorieId = categoryIdByName.get(key) || null;
        if (!categorieId) {
          const created = await createCategory({ nom: row.categorie, parentId: null });
          categorieId = created.id;
          categoryIdByName.set(key, categorieId);
        }
      }

      const created = await createProduct({
        nom: row.nom,
        categorie_id: categorieId,
        marque: row.marque,
        unite: row.unite,
        sku: row.sku,
        code_barre: row.code_barre,
        prix_achat: row.prix_achat,
        prix_vente: row.prix_vente,
        taux_tva: row.taux_tva,
        stock_minimum: row.stock_minimum,
      });

      if (row.stock_initial > 0) {
        await registerStockMovement({
          produitId: created.id,
          type: 'inventaire',
          nouvelleQuantite: row.stock_initial,
          motif: 'Stock initial (import)',
        });
      }

      results.push({ row, success: true });
    } catch (err) {
      const message =
        err?.code === '23505' ? 'SKU déjà utilisé par un autre produit' : err.message || 'Erreur inconnue';
      results.push({ row, success: false, error: message });
    }

    onProgress?.(i + 1, validRows.length);
  }

  return results;
}
