import { supabase } from '../supabase/client';

const SALE_SELECT =
  '*, client:clients(id, nom, telephone), lignes:lignes_vente(*, produit:produits(id, nom, unite)), paiements:paiements_vente(*)';

export async function fetchSales({ statut = null, limit = 200 } = {}) {
  let query = supabase.from('ventes').select(SALE_SELECT).order('created_at', { ascending: false }).limit(limit);

  if (statut) {
    query = query.eq('statut', statut);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchSale(id) {
  const { data, error } = await supabase.from('ventes').select(SALE_SELECT).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createSale({ clientId, statut, typeFacture, lignes, montantPayeInitial, notes }) {
  const { data, error } = await supabase.rpc('creer_vente', {
    p_client_id: clientId || null,
    p_statut: statut,
    p_type_facture: typeFacture,
    p_lignes: lignes,
    p_montant_paye_initial: montantPayeInitial || 0,
    p_notes: notes || null,
  });
  if (error) throw error;
  return data;
}

export async function cancelSale(venteId) {
  const { data, error } = await supabase.rpc('annuler_vente', { p_vente_id: venteId });
  if (error) throw error;
  return data;
}

export async function addPayment({ venteId, montant, moyenPaiement, notes }) {
  const { data, error } = await supabase
    .from('paiements_vente')
    .insert({ vente_id: venteId, montant, moyen_paiement: moyenPaiement, notes: notes || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}
