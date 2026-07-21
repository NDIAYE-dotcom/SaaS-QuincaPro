import { supabase } from '../supabase/client';

export async function createPaydunyaInvoice(dureeMois) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Session expirée, reconnectez-vous');

  const response = await fetch('/api/paydunya/create-invoice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ dureeMois }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erreur lors de la création du paiement');
  return data.url;
}
