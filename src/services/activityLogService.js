import { supabase } from '../supabase/client';

function formatMoney(amount) {
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`;
}

export async function fetchActivityLog({ limit = 100 }, t) {
  const [ventesRes, achatsRes, mouvementsRes] = await Promise.all([
    supabase
      .from('ventes')
      .select('id, numero, statut, total_ttc, created_at, cree_par:profiles(nom_complet)')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('achats')
      .select('id, numero, statut, total_ttc, created_at, cree_par:profiles(nom_complet)')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('mouvements_stock')
      .select('id, type, quantite, motif, created_at, produit:produits(nom), cree_par:profiles(nom_complet)')
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const firstError = [ventesRes, achatsRes, mouvementsRes].find((r) => r.error);
  if (firstError) throw firstError.error;

  const MOUVEMENT_LABELS = {
    entree: t('stock.typeIn'),
    sortie: t('stock.typeOut'),
    correction: t('stock.typeCorrection'),
    inventaire: t('stock.typeInventory'),
  };

  const items = [
    ...ventesRes.data.map((v) => ({
      id: `vente-${v.id}`,
      date: v.created_at,
      utilisateur: v.cree_par?.nom_complet || t('activityLog.system'),
      description:
        t('activityLog.saleCreated', { numero: v.numero, amount: formatMoney(v.total_ttc) }) +
        (v.statut === 'annulee' ? t('activityLog.saleCancelledSuffix') : ''),
    })),
    ...achatsRes.data.map((a) => ({
      id: `achat-${a.id}`,
      date: a.created_at,
      utilisateur: a.cree_par?.nom_complet || t('activityLog.system'),
      description:
        t('activityLog.purchaseCreated', { numero: a.numero, amount: formatMoney(a.total_ttc) }) +
        (a.statut === 'annule' ? t('activityLog.purchaseCancelledSuffix') : ''),
    })),
    ...mouvementsRes.data.map((m) => ({
      id: `mvt-${m.id}`,
      date: m.created_at,
      utilisateur: m.cree_par?.nom_complet || t('activityLog.system'),
      description:
        t('activityLog.movementDescription', {
          type: MOUVEMENT_LABELS[m.type] || m.type,
          qty: m.quantite,
          product: m.produit?.nom || t('activityLog.deletedProduct'),
        }) + (m.motif ? ` — ${m.motif}` : ''),
    })),
  ];

  return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}
