import { supabase } from '../supabase/client';

export async function fetchTeamMembers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function setMemberRole(id, role) {
  const { data, error } = await supabase.from('profiles').update({ role }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function setMemberActive(id, actif) {
  const { data, error } = await supabase.from('profiles').update({ actif }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function removeMember(id) {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchInvitations() {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createInvitation({ email, role, nomComplet }) {
  const { data, error } = await supabase
    .from('invitations')
    .insert({ email, role, nom_complet: nomComplet })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function revokeInvitation(id) {
  const { error } = await supabase.from('invitations').delete().eq('id', id);
  if (error) throw error;
}
