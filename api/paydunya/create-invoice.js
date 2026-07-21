import { paydunyaBaseUrl, paydunyaHeaders } from '../_paydunya.js';

// Appels REST Supabase en fetch direct plutôt que @supabase/supabase-js : le SDK instancie un
// client Realtime dans son constructeur, qui exige le WebSocket natif (Node 22+) et plante sur
// les runtimes Node plus anciens — inutile ici, ces fonctions ne font que de l'auth + du REST.

const PRIX_MENSUEL_FCFA = 5000;

async function getUserFromToken(accessToken) {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function getOwnProfile(accessToken, userId) {
  const url = new URL(`${process.env.VITE_SUPABASE_URL}/rest/v1/profiles`);
  url.searchParams.set('id', `eq.${userId}`);
  url.searchParams.set('select', 'role,entreprise_id,entreprise:entreprises(id,nom)');

  const res = await fetch(url, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.pgrst.object+json',
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) {
    res.status(401).json({ error: 'Authentification requise' });
    return;
  }

  const dureeMois = Math.max(1, Math.min(12, Number(req.body?.dureeMois) || 1));

  const user = await getUserFromToken(accessToken);
  if (!user?.id) {
    res.status(401).json({ error: 'Session expirée, reconnectez-vous' });
    return;
  }

  const profile = await getOwnProfile(accessToken, user.id);
  if (!profile?.entreprise_id) {
    res.status(403).json({ error: 'Profil ou entreprise introuvable' });
    return;
  }
  if (profile.role !== 'admin' && profile.role !== 'super_admin') {
    res.status(403).json({ error: "Seul l'administrateur de l'entreprise peut payer l'abonnement" });
    return;
  }

  const montant = PRIX_MENSUEL_FCFA * dureeMois;
  const baseUrl = `https://${req.headers.host}`;

  let paydunyaData;
  try {
    const paydunyaRes = await fetch(`${paydunyaBaseUrl()}/checkout-invoice/create`, {
      method: 'POST',
      headers: paydunyaHeaders(),
      body: JSON.stringify({
        invoice: {
          total_amount: montant,
          description: `Abonnement QuincaPro - ${profile.entreprise.nom} - ${dureeMois} mois`,
        },
        store: { name: 'QuincaPro' },
        actions: {
          cancel_url: `${baseUrl}/parametres?abonnement=annule`,
          return_url: `${baseUrl}/parametres?abonnement=succes`,
          callback_url: `${baseUrl}/api/paydunya/webhook`,
        },
        custom_data: {
          entreprise_id: profile.entreprise_id,
          duree_mois: dureeMois,
        },
      }),
    });
    paydunyaData = await paydunyaRes.json();
  } catch {
    res.status(502).json({ error: 'Impossible de contacter PayDunya, réessayez.' });
    return;
  }

  if (paydunyaData.response_code !== '00') {
    res.status(502).json({ error: paydunyaData.response_text || 'Erreur PayDunya' });
    return;
  }

  res.status(200).json({ url: paydunyaData.response_text });
}
