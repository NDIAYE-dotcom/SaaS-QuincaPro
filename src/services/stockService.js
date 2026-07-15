import { supabase } from '../supabase/client';

export async function fetchStockMovements({ produitId = null, limit = 100 } = {}) {
  let query = supabase
    .from('mouvements_stock')
    .select('*, produit:produits(id, nom, unite), auteur:profiles(id, nom_complet)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (produitId) {
    query = query.eq('produit_id', produitId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function registerStockMovement({ produitId, type, quantite, nouvelleQuantite, motif }) {
  const { data, error } = await supabase.rpc('enregistrer_mouvement_stock', {
    p_produit_id: produitId,
    p_type: type,
    p_quantite: quantite ?? 0,
    p_nouvelle_quantite: nouvelleQuantite ?? null,
    p_motif: motif || null,
  });
  if (error) throw error;
  return data;
}
