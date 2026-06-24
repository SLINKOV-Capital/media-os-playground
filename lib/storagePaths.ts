export const MATERIAL_PREVIEWS_BUCKET = "material-previews";

export function materialPreviewStoragePath(userId: string, materialId: string) {
  return `${userId}/${materialId}/preview.webp`;
}

export function getMaterialPreviewPublicUrl(
  supabaseUrl: string,
  userId: string,
  materialId: string
) {
  const path = materialPreviewStoragePath(userId, materialId);
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${MATERIAL_PREVIEWS_BUCKET}/${path}`;
}
