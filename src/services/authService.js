import { supabase } from '../supabase/client';

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp({ email, password, metadata }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;
  return data;
}

export async function registerEntreprise({ nom, nomComplet, telephone }) {
  const { data, error } = await supabase.rpc('register_entreprise', {
    p_nom: nom,
    p_nom_complet: nomComplet,
    p_telephone: telephone || null,
  });
  if (error) throw error;
  return data;
}

export async function getInvitation(token) {
  const { data, error } = await supabase.rpc('get_invitation', { p_token: token });
  if (error) throw error;
  return data?.[0] || null;
}

export async function acceptInvitation(token) {
  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
