// Fichier utilitaire partagé — le préfixe "_" l'exclut du routage Vercel (ce n'est pas un
// endpoint), contrairement aux fichiers dans api/paydunya/*.js qui, eux, en sont un.

export function paydunyaBaseUrl() {
  const mode = (process.env.PAYDUNYA_MODE || 'test').toLowerCase();
  return mode === 'live' ? 'https://app.paydunya.com/api/v1' : 'https://app.paydunya.com/sandbox-api/v1';
}

export function paydunyaHeaders() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'PAYDUNYA-MASTER-KEY': process.env.PAYDUNYA_MASTER_KEY,
    'PAYDUNYA-PRIVATE-KEY': process.env.PAYDUNYA_PRIVATE_KEY,
    'PAYDUNYA-TOKEN': process.env.PAYDUNYA_TOKEN,
  };
}
