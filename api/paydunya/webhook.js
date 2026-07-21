import { paydunyaBaseUrl, paydunyaHeaders } from '../_paydunya.js';

// Appel REST Supabase en fetch direct (voir create-invoice.js pour le pourquoi : le SDK
// @supabase/supabase-js instancie un client Realtime qui exige le WebSocket natif de Node 22+).
async function confirmerPaiement({ entrepriseId, montant, dureeMois, reference }) {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/rpc/paydunya_confirmer_paiement`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_entreprise_id: entrepriseId,
      p_montant: montant,
      p_duree_mois: dureeMois,
      p_reference: reference,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Échec RPC (${res.status})`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  // PayDunya ajoute "?token=..." à l'URL de callback. On ignore volontairement le corps du POST
  // (form-urlencoded, falsifiable par quiconque connaît l'URL) et on revérifie le statut du
  // paiement directement auprès de PayDunya avec nos propres identifiants secrets — seule source
  // qu'on peut faire confiance pour activer un abonnement.
  const token = req.query?.token;
  if (!token) {
    res.status(400).json({ error: 'Token manquant' });
    return;
  }

  let confirmData;
  try {
    const confirmRes = await fetch(`${paydunyaBaseUrl()}/checkout-invoice/confirm/${token}`, {
      headers: paydunyaHeaders(),
    });
    confirmData = await confirmRes.json();
  } catch {
    // Erreur réseau vers PayDunya : on répond en erreur pour que PayDunya réessaie plus tard.
    res.status(502).json({ error: 'Impossible de vérifier le paiement auprès de PayDunya' });
    return;
  }

  if (confirmData.response_code !== '00' || confirmData.status !== 'completed') {
    // Paiement annulé, en attente, ou introuvable : rien à activer, mais on acquitte pour
    // éviter que PayDunya ne renvoie indéfiniment le même événement.
    res.status(200).json({ ok: true, status: confirmData.status || 'unknown' });
    return;
  }

  const entrepriseId = confirmData.custom_data?.entreprise_id;
  const dureeMois = Number(confirmData.custom_data?.duree_mois) || 1;
  const montant = Number(confirmData.invoice?.total_amount) || 0;

  if (!entrepriseId) {
    res.status(400).json({ error: 'custom_data.entreprise_id manquant dans la réponse PayDunya' });
    return;
  }

  try {
    await confirmerPaiement({ entrepriseId, montant, dureeMois, reference: token });
  } catch (err) {
    console.error('paydunya webhook: échec paydunya_confirmer_paiement', err);
    res.status(500).json({ error: err.message });
    return;
  }

  res.status(200).json({ ok: true });
}
