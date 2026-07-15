import { supabase } from '../supabase/client';

const PRODUCT_PHOTOS_BUCKET = 'produits-photos';

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
