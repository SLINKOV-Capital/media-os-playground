export const MATERIAL_PREVIEWS_BUCKET = "material-previews";
export const DOCUMENT_IMAGES_BUCKET = "document-images";

export type MaterialPreviewExtension = "gif" | "jpg" | "png" | "webp";

export function materialPreviewStoragePath(
  userId: string,
  materialId: string,
  extension: MaterialPreviewExtension = "webp"
) {
  return `${userId}/${materialId}/preview.${extension}`;
}

export function getMaterialPreviewPublicUrl(
  supabaseUrl: string,
  userId: string,
  materialId: string,
  extension: MaterialPreviewExtension = "webp"
) {
  const path = materialPreviewStoragePath(userId, materialId, extension);
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${MATERIAL_PREVIEWS_BUCKET}/${path}`;
}

export function materialPreviewStoragePaths(userId: string, materialId: string) {
  return (["gif", "jpg", "png", "webp"] as const).map((extension) =>
    materialPreviewStoragePath(userId, materialId, extension)
  );
}

export function documentImageStoragePath(
  userId: string,
  documentId: string,
  assetId: string
) {
  return `${userId}/${documentId}/${assetId}/image.webp`;
}

export function getDocumentImagePublicUrl(
  supabaseUrl: string,
  storagePath: string
) {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${DOCUMENT_IMAGES_BUCKET}/${storagePath}`;
}
