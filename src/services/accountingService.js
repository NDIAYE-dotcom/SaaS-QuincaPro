import { supabase } from '../supabase/client';

export async function fetchAccounts() {
  const { data, error } = await supabase.from('comptes_comptables').select('*').order('numero');
  if (error) throw error;
  return data;
}

export async function createAccount({ numero, nom, nature }) {
  const { data, error } = await supabase
    .from('comptes_comptables')
    .insert({ numero, nom, nature })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchEntries({ limit = 300 } = {}) {
  const { data, error } = await supabase
    .from('ecritures_comptables')
    .select('*, lignes:lignes_ecriture(*, compte:comptes_comptables(id, numero, nom))')
    .order('date_ecriture', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function createEntry({ libelle, lignes, date, origine = 'manuelle' }) {
  const { data, error } = await supabase.rpc('creer_ecriture', {
    p_libelle: libelle,
    p_lignes: lignes,
    p_date: date || null,
    p_origine: origine,
    p_reference_id: null,
  });
  if (error) throw error;
  return data;
}

export async function fetchBalance() {
  const { data, error } = await supabase.from('v_balance').select('*').order('numero');
  if (error) throw error;
  return data;
}

export async function fetchLedgerLines() {
  const { data, error } = await supabase
    .from('lignes_ecriture')
    .select(
      '*, ecriture:ecritures_comptables(numero, date_ecriture, libelle), compte:comptes_comptables(id, numero, nom)',
    )
    .order('created_at');
  if (error) throw error;
  return data;
}
