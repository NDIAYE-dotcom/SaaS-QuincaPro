import { supabase } from '../supabase/client';

export async function fetchProfileWithEntreprise(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, entreprise:entreprises(*)')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}
