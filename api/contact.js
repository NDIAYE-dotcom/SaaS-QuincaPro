const CONTACT_DESTINATION_EMAIL = 'gquinca25@gmail.com';
const CONTACT_SENDER_EMAIL = 'no-reply@g-quinca.com';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const { nom, email, message, website } = req.body || {};

  // Honeypot : champ caché que seuls les bots remplissent. On répond "succès" sans rien
  // envoyer, pour ne pas leur révéler que c'est un piège.
  if (website) {
    res.status(200).json({ ok: true });
    return;
  }

  const trimmedNom = (nom || '').trim();
  const trimmedEmail = (email || '').trim();
  const trimmedMessage = (message || '').trim();

  if (!trimmedNom || trimmedNom.length > 200) {
    res.status(400).json({ error: 'Nom invalide' });
    return;
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    res.status(400).json({ error: 'Adresse email invalide' });
    return;
  }
  if (!trimmedMessage || trimmedMessage.length < 5 || trimmedMessage.length > 5000) {
    res.status(400).json({ error: 'Message invalide' });
    return;
  }

  if (!process.env.SENDGRID_API_KEY) {
    res.status(500).json({ error: "Le service d'envoi d'email n'est pas configuré." });
    return;
  }

  try {
    const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: CONTACT_DESTINATION_EMAIL }] }],
        from: { email: CONTACT_SENDER_EMAIL, name: 'G-Quinca — Formulaire de contact' },
        reply_to: { email: trimmedEmail, name: trimmedNom },
        subject: `Nouveau message de contact — ${trimmedNom}`,
        content: [
          {
            type: 'text/plain',
            value: `Nom : ${trimmedNom}\nEmail : ${trimmedEmail}\n\nMessage :\n${trimmedMessage}`,
          },
        ],
      }),
    });

    if (!sgRes.ok) {
      const errBody = await sgRes.text();
      console.error('contact: échec envoi SendGrid', sgRes.status, errBody);
      res.status(502).json({ error: "Impossible d'envoyer le message, réessayez." });
      return;
    }
  } catch (err) {
    console.error('contact: erreur réseau SendGrid', err);
    res.status(502).json({ error: "Impossible d'envoyer le message, réessayez." });
    return;
  }

  res.status(200).json({ ok: true });
}
