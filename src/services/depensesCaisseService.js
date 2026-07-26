import { supabase } from '../supabase/client';

export async function fetchDepenses({ limit = 200 } = {}) {
  const { data, error } = await supabase
    .from('depenses_caisse')
    .select('*, cree_par:profiles(nom_complet)')
    .order('date_depense', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function createDepense({ dateDepense, categorie, description, montant }) {
  const { data, error } = await supabase
    .from('depenses_caisse')
    .insert({
      date_depense: dateDepense,
      categorie,
      description: description || null,
      montant,
    })
    .select('*, cree_par:profiles(nom_complet)')
    .single();

  if (error) throw error;
  return data;
}

export async function cancelDepense(id) {
  const { data, error } = await supabase
    .from('depenses_caisse')
    .update({ annulee: true, annulee_le: new Date().toISOString() })
    .eq('id', id)
    .select('*, cree_par:profiles(nom_complet)')
    .single();

  if (error) throw error;
  return data;
}
