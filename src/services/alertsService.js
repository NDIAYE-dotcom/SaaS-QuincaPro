import { supabase } from '../supabase/client';

export async function fetchLowStockAlerts() {
  const { data, error } = await supabase
    .from('produits')
    .select('id, nom, unite, quantite_stock, stock_minimum')
    .eq('actif', true);
  if (error) throw error;

  return data
    .filter((p) => Number(p.quantite_stock) <= Number(p.stock_minimum))
    .sort((a, b) => Number(a.quantite_stock) - Number(b.quantite_stock));
}
