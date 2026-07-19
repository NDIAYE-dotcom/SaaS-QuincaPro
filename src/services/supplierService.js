import { supabase } from '../supabase/client';

function sanitizeSearchTerm(search) {
  // "_" est aussi un joker en SQL ILIKE (caractère unique) : on l'échappe pour qu'une recherche
  // comme "SKU_001" ne matche pas aussi "SKUX001" par exemple.
  return search
    .replace(/[%,()]/g, ' ')
    .trim()
    .replace(/_/g, '\\_');
}

export async function fetchSuppliers(search = '') {
  let query = supabase.from('fournisseurs').select('*').order('nom');

  const safeSearch = sanitizeSearchTerm(search);
  if (safeSearch) {
    query = query.or(`nom.ilike.%${safeSearch}%,telephone.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createSupplier(payload) {
  const { data, error } = await supabase.from('fournisseurs').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateSupplier(id, payload) {
  const { data, error } = await supabase.from('fournisseurs').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSupplier(id) {
  const { error } = await supabase.from('fournisseurs').delete().eq('id', id);
  if (error) throw error;
}
