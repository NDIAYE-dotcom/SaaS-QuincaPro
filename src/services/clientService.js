import { supabase } from '../supabase/client';

function sanitizeSearchTerm(search) {
  // "_" est aussi un joker en SQL ILIKE (caractère unique) : on l'échappe pour qu'une recherche
  // comme "SKU_001" ne matche pas aussi "SKUX001" par exemple.
  return search
    .replace(/[%,()]/g, ' ')
    .trim()
    .replace(/_/g, '\\_');
}

export async function fetchClients(search = '') {
  let query = supabase.from('clients').select('*').order('nom');

  const safeSearch = sanitizeSearchTerm(search);
  if (safeSearch) {
    query = query.or(`nom.ilike.%${safeSearch}%,telephone.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createClient(payload) {
  const { data, error } = await supabase.from('clients').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateClient(id, payload) {
  const { data, error } = await supabase.from('clients').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}
