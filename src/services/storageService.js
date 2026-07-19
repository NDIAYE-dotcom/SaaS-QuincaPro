import { supabase } from '../supabase/client';

const PRODUCT_PHOTOS_BUCKET = 'produits-photos';
const ENTREPRISE_LOGOS_BUCKET = 'entreprise-logos';

export async function uploadProductPhoto(entrepriseId, file) {
  const ext = file.name.split('.').pop();
  const path = `${entrepriseId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(PRODUCT_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProductPhoto(publicUrl) {
  if (!publicUrl) return;
  const marker = `/object/public/${PRODUCT_PHOTOS_BUCKET}/`;
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) return;

  const path = publicUrl.slice(markerIndex + marker.length);
  await supabase.storage.from(PRODUCT_PHOTOS_BUCKET).remove([path]);
}

async function uploadEntrepriseAsset(entrepriseId, file, name) {
  const ext = file.name.split('.').pop();
  const filename = `${name}.${ext}`;
  const path = `${entrepriseId}/${filename}`;

  const { error } = await supabase.storage.from(ENTREPRISE_LOGOS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;

  // upsert:true n'écrase que si le chemin est identique : si l'extension change d'un envoi à
  // l'autre (ex. logo.png -> logo.jpg), l'ancien fichier reste orphelin dans le bucket.
  const { data: existing } = await supabase.storage.from(ENTREPRISE_LOGOS_BUCKET).list(entrepriseId);
  const staleFiles = (existing || [])
    .filter((f) => f.name.startsWith(`${name}.`) && f.name !== filename)
    .map((f) => `${entrepriseId}/${f.name}`);
  if (staleFiles.length > 0) {
    await supabase.storage.from(ENTREPRISE_LOGOS_BUCKET).remove(staleFiles);
  }

  const { data } = supabase.storage.from(ENTREPRISE_LOGOS_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function uploadEntrepriseLogo(entrepriseId, file) {
  return uploadEntrepriseAsset(entrepriseId, file, 'logo');
}

export async function uploadEntrepriseCachet(entrepriseId, file) {
  return uploadEntrepriseAsset(entrepriseId, file, 'cachet');
}

export async function uploadEntrepriseSignature(entrepriseId, file) {
  return uploadEntrepriseAsset(entrepriseId, file, 'signature');
}
