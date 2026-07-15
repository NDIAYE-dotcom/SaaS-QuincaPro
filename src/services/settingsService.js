import { supabase } from '../supabase/client';

export async function updateEntreprise(id, payload) {
  const { data, error } = await supabase.from('entreprises').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
