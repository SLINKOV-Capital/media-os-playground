import {
  MAX_PREVIEW_INPUT_BYTES,
  resizeImageToWebp,
} from "@/lib/materialPreviewResize";
import {
  MATERIAL_IMAGES_BUCKET,
  MATERIAL_PREVIEWS_BUCKET,
  type MaterialImageExtension,
  materialImageStoragePath,
  materialPreviewStoragePath,
} from "@/lib/storagePaths";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MATERIAL_IMAGE_ACCEPT =
  "image/avif,image/gif,image/jpeg,image/png,image/webp";

const MIME_EXTENSIONS: Record<string, MaterialImageExtension> = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateMaterialImage(file: File): MaterialImageExtension {
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) {
    throw new Error("Поддерживаются AVIF, GIF, JPEG, PNG и WebP");
  }
  if (file.size === 0 || file.size > MAX_PREVIEW_INPUT_BYTES) {
    throw new Error("Размер изображения должен быть не больше 20 МБ");
  }
  return extension;
}

export async function uploadMaterialImageFiles({
  supabase,
  userId,
  materialId,
  file,
}: {
  supabase: SupabaseClient;
  userId: string;
  materialId: string;
  file: File;
}) {
  const extension = validateMaterialImage(file);
  const sourcePath = materialImageStoragePath(userId, materialId, extension);
  const previewPath = materialPreviewStoragePath(userId, materialId);
  const previewBlob = await resizeImageToWebp(file);
  const [{ error: sourceError }, { error: previewError }] = await Promise.all([
    supabase.storage.from(MATERIAL_IMAGES_BUCKET).upload(sourcePath, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: true,
    }),
    supabase.storage
      .from(MATERIAL_PREVIEWS_BUCKET)
      .upload(previewPath, previewBlob, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      }),
  ]);

  if (sourceError || previewError) {
    await Promise.all([
      supabase.storage.from(MATERIAL_IMAGES_BUCKET).remove([sourcePath]),
      supabase.storage.from(MATERIAL_PREVIEWS_BUCKET).remove([previewPath]),
    ]);
    throw new Error(sourceError?.message ?? previewError?.message);
  }

  return { extension, sourcePath, previewPath };
}
