import { supabase } from '../supabase/client';

const SELECT_COLUMNS = '*, categorie:categories(id, nom, parent_id)';

function sanitizeSearchTerm(search) {
  return search.replace(/[%,()]/g, ' ').trim();
}

export async function fetchProducts({ search = '', categorieId = null } = {}) {
  let query = supabase.from('produits').select(SELECT_COLUMNS).order('nom');

  const safeSearch = sanitizeSearchTerm(search);
  if (safeSearch) {
    query = query.or(`nom.ilike.%${safeSearch}%,sku.ilike.%${safeSearch}%,code_barre.ilike.%${safeSearch}%`);
  }
  if (categorieId) {
    query = query.eq('categorie_id', categorieId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createProduct(payload) {
  const { data, error } = await supabase.from('produits').insert(payload).select(SELECT_COLUMNS).single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id, payload) {
  const { data, error } = await supabase
    .from('produits')
    .update(payload)
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('produits').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'Impossible de supprimer ce produit : il a des ventes ou mouvements associés. Désactivez-le plutôt.',
      );
    }
    throw error;
  }
}
