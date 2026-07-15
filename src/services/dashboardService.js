import { supabase } from '../supabase/client';

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export async function fetchDashboardData() {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = startOfMonth(now);
  const chartStart = startOfDay(new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000));

  const [
    ventesMoisRes,
    ventesJourRes,
    ventesImpayeesRes,
    achatsMoisRes,
    produitsRes,
    clientsRes,
    fournisseursRes,
    ventesChartRes,
    topProduitsRes,
    recentesRes,
  ] = await Promise.all([
    supabase
      .from('ventes')
      .select('total_ttc')
      .eq('statut', 'facture')
      .gte('created_at', monthStart.toISOString()),
    supabase
      .from('ventes')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'facture')
      .gte('created_at', today.toISOString()),
    supabase
      .from('ventes')
      .select('id', { count: 'exact', head: true })
      .eq('statut', 'facture')
      .neq('statut_paiement', 'paye'),
    supabase
      .from('achats')
      .select('total_ttc')
      .eq('statut', 'recu')
      .gte('created_at', monthStart.toISOString()),
    supabase.from('produits').select('nom, quantite_stock, stock_minimum').eq('actif', true),
    supabase.from('clients').select('solde_dette'),
    supabase.from('fournisseurs').select('solde_dette'),
    supabase
      .from('ventes')
      .select('total_ttc, created_at')
      .eq('statut', 'facture')
      .gte('created_at', chartStart.toISOString()),
    supabase
      .from('lignes_vente')
      .select('quantite, produits(nom), ventes!inner(statut, created_at)')
      .eq('ventes.statut', 'facture')
      .gte('ventes.created_at', monthStart.toISOString()),
    supabase
      .from('ventes')
      .select('id, numero, total_ttc, statut_paiement, created_at, client:clients(nom)')
      .eq('statut', 'facture')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const firstError = [
    ventesMoisRes,
    ventesJourRes,
    ventesImpayeesRes,
    achatsMoisRes,
    produitsRes,
    clientsRes,
    fournisseursRes,
    ventesChartRes,
    topProduitsRes,
    recentesRes,
  ].find((r) => r.error);
  if (firstError) throw firstError.error;

  const caMois = ventesMoisRes.data.reduce((sum, v) => sum + Number(v.total_ttc), 0);
  const achatsMois = achatsMoisRes.data.reduce((sum, a) => sum + Number(a.total_ttc), 0);

  const produits = produitsRes.data;
  const produitsRupture = produits.filter((p) => Number(p.quantite_stock) <= 0).length;
  const produitsStockFaible = produits.filter(
    (p) => Number(p.quantite_stock) > 0 && Number(p.quantite_stock) <= Number(p.stock_minimum),
  ).length;

  const dettesClients = clientsRes.data.reduce((sum, c) => sum + Number(c.solde_dette), 0);
  const dettesFournisseurs = fournisseursRes.data.reduce((sum, f) => sum + Number(f.solde_dette), 0);

  const chartBuckets = new Map();
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(chartStart.getTime() + i * 24 * 60 * 60 * 1000);
    chartBuckets.set(dayKey(d), 0);
  }
  ventesChartRes.data.forEach((v) => {
    const key = dayKey(v.created_at);
    if (chartBuckets.has(key)) {
      chartBuckets.set(key, chartBuckets.get(key) + Number(v.total_ttc));
    }
  });

  const topProduitsMap = new Map();
  topProduitsRes.data.forEach((l) => {
    const nom = l.produits?.nom || 'Produit supprimé';
    topProduitsMap.set(nom, (topProduitsMap.get(nom) || 0) + Number(l.quantite));
  });
  const topProduits = [...topProduitsMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([nom, quantite]) => ({ nom, quantite }));

  return {
    caMois,
    ventesJour: ventesJourRes.count || 0,
    ventesImpayees: ventesImpayeesRes.count || 0,
    achatsMois,
    produitsRupture,
    produitsStockFaible,
    dettesClients,
    dettesFournisseurs,
    chart: {
      labels: [...chartBuckets.keys()],
      data: [...chartBuckets.values()],
    },
    topProduits,
    recentes: recentesRes.data,
  };
}
