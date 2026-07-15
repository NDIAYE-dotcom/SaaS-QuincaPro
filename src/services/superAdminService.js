import { supabase } from '../supabase/client';

export async function fetchEntreprises(search = '') {
  let query = supabase
    .from('entreprises')
    .select('*, profiles(count)')
    .order('created_at', { ascending: false });

  if (search.trim()) {
    query = query.ilike('nom', `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchEntrepriseStats() {
  const { data, error } = await supabase.from('entreprises').select('statut_abonnement');
  if (error) throw error;

  const stats = { total: data.length, actif: 0, en_attente_paiement: 0, expire: 0, suspendu: 0 };
  data.forEach((row) => {
    stats[row.statut_abonnement] = (stats[row.statut_abonnement] || 0) + 1;
  });
  return stats;
}

export async function fetchRevenueStats() {
  const { data, error } = await supabase.from('abonnement_paiements').select('montant, created_at');
  if (error) throw error;

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  let total = 0;
  let moisEnCours = 0;

  data.forEach((row) => {
    const montant = Number(row.montant);
    total += montant;
    const created = new Date(row.created_at);
    if (`${created.getFullYear()}-${created.getMonth()}` === monthKey) {
      moisEnCours += montant;
    }
  });

  return { total, moisEnCours };
}

export async function fetchPaymentHistory(entrepriseId) {
  const { data, error } = await supabase
    .from('abonnement_paiements')
    .select('*')
    .eq('entreprise_id', entrepriseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function activateSubscription({ entrepriseId, montant, methode, dureeMois, notes }) {
  const { data, error } = await supabase.rpc('admin_activer_abonnement', {
    p_entreprise_id: entrepriseId,
    p_montant: montant,
    p_methode: methode,
    p_duree_mois: dureeMois,
    p_notes: notes || null,
  });

  if (error) throw error;
  return data;
}

export async function setSubscriptionStatus(entrepriseId, statut) {
  const { data, error } = await supabase.rpc('admin_definir_statut_abonnement', {
    p_entreprise_id: entrepriseId,
    p_statut: statut,
  });

  if (error) throw error;
  return data;
}

export async function fetchAnnouncements() {
  const { data, error } = await supabase
    .from('annonces')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchActiveAnnouncements() {
  const { data, error } = await supabase
    .from('annonces')
    .select('*')
    .eq('actif', true)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) throw error;
  return data;
}

export async function createAnnouncement({ titre, message }) {
  const { data, error } = await supabase
    .from('annonces')
    .insert({ titre, message })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function setAnnouncementActive(id, actif) {
  const { data, error } = await supabase
    .from('annonces')
    .update({ actif })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from('annonces').delete().eq('id', id);
  if (error) throw error;
}
