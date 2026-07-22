import { supabase } from '../supabase/client';

const MOUVEMENT_LABELS = {
  entree: 'Entrée',
  sortie: 'Sortie',
  correction: 'Correction',
  inventaire: 'Inventaire',
};

const VENTE_STATUT_SUFFIX = { annulee: ' (annulée)' };
const ACHAT_STATUT_SUFFIX = { annulee: ' (annulé)' };

function formatMoney(amount) {
  return `${Number(amount).toLocaleString('fr-FR')} FCFA`;
}

export async function fetchActivityLog({ limit = 100 } = {}) {
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

  const items = [
    ...ventesRes.data.map((v) => ({
      id: `vente-${v.id}`,
      date: v.created_at,
      utilisateur: v.cree_par?.nom_complet || 'Système',
      description: `Vente ${v.numero} créée (${formatMoney(v.total_ttc)})${VENTE_STATUT_SUFFIX[v.statut] || ''}`,
    })),
    ...achatsRes.data.map((a) => ({
      id: `achat-${a.id}`,
      date: a.created_at,
      utilisateur: a.cree_par?.nom_complet || 'Système',
      description: `Achat ${a.numero} créé (${formatMoney(a.total_ttc)})${ACHAT_STATUT_SUFFIX[a.statut] || ''}`,
    })),
    ...mouvementsRes.data.map((m) => ({
      id: `mvt-${m.id}`,
      date: m.created_at,
      utilisateur: m.cree_par?.nom_complet || 'Système',
      description: `${MOUVEMENT_LABELS[m.type] || m.type} de ${m.quantite} sur « ${m.produit?.nom || 'produit supprimé'} »${m.motif ? ` — ${m.motif}` : ''}`,
    })),
  ];

  return items.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
}
