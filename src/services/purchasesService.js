import { supabase } from '../supabase/client';

const PURCHASE_SELECT =
  '*, fournisseur:fournisseurs(id, nom, telephone, email, adresse), lignes:lignes_achat(*, produit:produits(id, nom, unite)), paiements:paiements_achat(*)';

export async function fetchPurchases({ statut = null, limit = 200 } = {}) {
  let query = supabase
    .from('achats')
    .select(PURCHASE_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (statut) {
    query = query.eq('statut', statut);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchPurchase(id) {
  const { data, error } = await supabase.from('achats').select(PURCHASE_SELECT).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createPurchase({ fournisseurId, statut, lignes, montantPayeInitial, notes }) {
  const { data, error } = await supabase.rpc('creer_achat', {
    p_fournisseur_id: fournisseurId || null,
    p_statut: statut,
    p_lignes: lignes,
    p_montant_paye_initial: montantPayeInitial || 0,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function cancelPurchase(achatId) {
  const { data, error } = await supabase.rpc('annuler_achat', { p_achat_id: achatId });
  if (error) throw error;
  return data;
}

export async function addPurchasePayment({ achatId, montant, moyenPaiement, notes }) {
  const { data, error } = await supabase
    .from('paiements_achat')
    .insert({ achat_id: achatId, montant, moyen_paiement: moyenPaiement, notes: notes || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}
