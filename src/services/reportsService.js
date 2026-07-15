import { supabase } from '../supabase/client';

function toIsoStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function toIsoEnd(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export async function fetchVentesReport({ from, to }) {
  const { data, error } = await supabase
    .from('ventes')
    .select('id, numero, created_at, total_ttc, total_tva, statut_paiement, client:clients(nom)')
    .eq('statut', 'facture')
    .gte('created_at', toIsoStart(from))
    .lte('created_at', toIsoEnd(to))
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map((v) => ({
    numero: v.numero,
    date: v.created_at,
    client: v.client?.nom || 'Client comptoir',
    total_ttc: Number(v.total_ttc),
    total_tva: Number(v.total_tva),
    statut_paiement: v.statut_paiement,
  }));
}

export async function fetchAchatsReport({ from, to }) {
  const { data, error } = await supabase
    .from('achats')
    .select('id, numero, created_at, total_ttc, total_tva, statut_paiement, fournisseur:fournisseurs(nom)')
    .eq('statut', 'recu')
    .gte('created_at', toIsoStart(from))
    .lte('created_at', toIsoEnd(to))
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map((a) => ({
    numero: a.numero,
    date: a.created_at,
    fournisseur: a.fournisseur?.nom || '—',
    total_ttc: Number(a.total_ttc),
    total_tva: Number(a.total_tva),
    statut_paiement: a.statut_paiement,
  }));
}

export async function fetchBeneficesReport({ from, to }) {
  const { data: ventes, error: ventesError } = await supabase
    .from('ventes')
    .select('id, numero, created_at, sous_total, total_ttc, client:clients(nom)')
    .eq('statut', 'facture')
    .gte('created_at', toIsoStart(from))
    .lte('created_at', toIsoEnd(to))
    .order('created_at', { ascending: false });
  if (ventesError) throw ventesError;

  if (ventes.length === 0) return [];

  const venteIds = ventes.map((v) => v.id);
  const { data: lignes, error: lignesError } = await supabase
    .from('lignes_vente')
    .select('vente_id, quantite, produit:produits(prix_achat)')
    .in('vente_id', venteIds);
  if (lignesError) throw lignesError;

  const coutParVente = new Map();
  lignes.forEach((l) => {
    const cout = Number(l.quantite) * Number(l.produit?.prix_achat || 0);
    coutParVente.set(l.vente_id, (coutParVente.get(l.vente_id) || 0) + cout);
  });

  return ventes.map((v) => {
    const cout = coutParVente.get(v.id) || 0;
    const marge = Number(v.sous_total) - cout;
    const margePourcentage = v.sous_total > 0 ? (marge / Number(v.sous_total)) * 100 : 0;
    return {
      numero: v.numero,
      date: v.created_at,
      client: v.client?.nom || 'Client comptoir',
      ca_ht: Number(v.sous_total),
      cout: cout,
      marge,
      marge_pourcentage: margePourcentage,
    };
  });
}

export async function fetchStockReport() {
  const { data, error } = await supabase
    .from('produits')
    .select('nom, sku, quantite_stock, stock_minimum, prix_achat, prix_vente, actif')
    .eq('actif', true)
    .order('nom', { ascending: true });

  if (error) throw error;
  return data.map((p) => ({
    nom: p.nom,
    sku: p.sku || '—',
    quantite_stock: Number(p.quantite_stock),
    stock_minimum: Number(p.stock_minimum),
    valeur_stock: Number(p.quantite_stock) * Number(p.prix_achat),
    statut:
      Number(p.quantite_stock) <= 0
        ? 'Rupture'
        : Number(p.quantite_stock) <= Number(p.stock_minimum)
          ? 'Faible'
          : 'OK',
  }));
}

export async function fetchProduitsReport() {
  const { data, error } = await supabase
    .from('produits')
    .select('nom, sku, unite, prix_achat, prix_vente, quantite_stock, actif, categorie:categories(nom)')
    .order('nom', { ascending: true });

  if (error) throw error;
  return data.map((p) => ({
    nom: p.nom,
    sku: p.sku || '—',
    categorie: p.categorie?.nom || '—',
    unite: p.unite,
    prix_achat: Number(p.prix_achat),
    prix_vente: Number(p.prix_vente),
    quantite_stock: Number(p.quantite_stock),
    statut: p.actif ? 'Actif' : 'Inactif',
  }));
}

export async function fetchTvaReport({ from, to }) {
  const [ventesRes, achatsRes] = await Promise.all([
    supabase
      .from('ventes')
      .select('numero, created_at, total_tva')
      .eq('statut', 'facture')
      .gte('created_at', toIsoStart(from))
      .lte('created_at', toIsoEnd(to)),
    supabase
      .from('achats')
      .select('numero, created_at, total_tva')
      .eq('statut', 'recu')
      .gte('created_at', toIsoStart(from))
      .lte('created_at', toIsoEnd(to)),
  ]);
  if (ventesRes.error) throw ventesRes.error;
  if (achatsRes.error) throw achatsRes.error;

  const tvaCollectee = ventesRes.data.reduce((sum, v) => sum + Number(v.total_tva), 0);
  const tvaDeductible = achatsRes.data.reduce((sum, a) => sum + Number(a.total_tva), 0);

  const rows = [
    ...ventesRes.data.map((v) => ({
      numero: v.numero,
      date: v.created_at,
      type: 'Vente (collectée)',
      montant_tva: Number(v.total_tva),
    })),
    ...achatsRes.data.map((a) => ({
      numero: a.numero,
      date: a.created_at,
      type: 'Achat (déductible)',
      montant_tva: Number(a.total_tva),
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return { rows, summary: { tvaCollectee, tvaDeductible, tvaNette: tvaCollectee - tvaDeductible } };
}

export async function fetchClientsReport({ from, to }) {
  const [clientsRes, ventesRes] = await Promise.all([
    supabase.from('clients').select('id, nom, telephone, solde_dette').eq('actif', true),
    supabase
      .from('ventes')
      .select('client_id, total_ttc')
      .eq('statut', 'facture')
      .gte('created_at', toIsoStart(from))
      .lte('created_at', toIsoEnd(to)),
  ]);
  if (clientsRes.error) throw clientsRes.error;
  if (ventesRes.error) throw ventesRes.error;

  const totalParClient = new Map();
  ventesRes.data.forEach((v) => {
    if (!v.client_id) return;
    totalParClient.set(v.client_id, (totalParClient.get(v.client_id) || 0) + Number(v.total_ttc));
  });

  return clientsRes.data
    .map((c) => ({
      nom: c.nom,
      telephone: c.telephone || '—',
      total_achats: totalParClient.get(c.id) || 0,
      solde_dette: Number(c.solde_dette),
    }))
    .sort((a, b) => b.total_achats - a.total_achats);
}

export async function fetchFournisseursReport({ from, to }) {
  const [fournisseursRes, achatsRes] = await Promise.all([
    supabase.from('fournisseurs').select('id, nom, telephone, solde_dette').eq('actif', true),
    supabase
      .from('achats')
      .select('fournisseur_id, total_ttc')
      .eq('statut', 'recu')
      .gte('created_at', toIsoStart(from))
      .lte('created_at', toIsoEnd(to)),
  ]);
  if (fournisseursRes.error) throw fournisseursRes.error;
  if (achatsRes.error) throw achatsRes.error;

  const totalParFournisseur = new Map();
  achatsRes.data.forEach((a) => {
    if (!a.fournisseur_id) return;
    totalParFournisseur.set(a.fournisseur_id, (totalParFournisseur.get(a.fournisseur_id) || 0) + Number(a.total_ttc));
  });

  return fournisseursRes.data
    .map((f) => ({
      nom: f.nom,
      telephone: f.telephone || '—',
      total_achats: totalParFournisseur.get(f.id) || 0,
      solde_dette: Number(f.solde_dette),
    }))
    .sort((a, b) => b.total_achats - a.total_achats);
}

export async function fetchComptabiliteReport({ from, to }) {
  const { data, error } = await supabase
    .from('lignes_ecriture')
    .select('debit, credit, compte:comptes_comptables(nature, nom), ecriture:ecritures_comptables!inner(date_ecriture)')
    .gte('ecriture.date_ecriture', new Date(from).toISOString().slice(0, 10))
    .lte('ecriture.date_ecriture', new Date(to).toISOString().slice(0, 10));

  if (error) throw error;

  let produits = 0;
  let charges = 0;
  const parCompte = new Map();

  data.forEach((l) => {
    const nature = l.compte?.nature;
    const nom = l.compte?.nom || 'Compte inconnu';
    const debit = Number(l.debit);
    const credit = Number(l.credit);

    if (nature === 'produit') {
      const solde = credit - debit;
      produits += solde;
      parCompte.set(nom, (parCompte.get(nom) || 0) + solde);
    } else if (nature === 'charge') {
      const solde = debit - credit;
      charges += solde;
      parCompte.set(nom, (parCompte.get(nom) || 0) - solde);
    }
  });

  const rows = [...parCompte.entries()]
    .map(([compte, solde]) => ({ compte, montant: solde }))
    .sort((a, b) => b.montant - a.montant);

  return { rows, summary: { produits, charges, resultat: produits - charges } };
}

export async function fetchDettesReport() {
  const [clientsRes, fournisseursRes] = await Promise.all([
    supabase.from('clients').select('nom, telephone, solde_dette').gt('solde_dette', 0),
    supabase.from('fournisseurs').select('nom, telephone, solde_dette').gt('solde_dette', 0),
  ]);
  if (clientsRes.error) throw clientsRes.error;
  if (fournisseursRes.error) throw fournisseursRes.error;

  const rows = [
    ...clientsRes.data.map((c) => ({ type: 'Client', nom: c.nom, telephone: c.telephone || '—', montant: Number(c.solde_dette) })),
    ...fournisseursRes.data.map((f) => ({ type: 'Fournisseur', nom: f.nom, telephone: f.telephone || '—', montant: Number(f.solde_dette) })),
  ].sort((a, b) => b.montant - a.montant);

  return rows;
}
