import { supabase } from '../supabase/client';

export async function fetchCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('nom');
  if (error) throw error;
  return data;
}

export async function createCategory({ nom, parentId }) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ nom, parent_id: parentId || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}
