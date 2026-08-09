"use server";

import type { MaterialImageExtension } from "@/lib/storagePaths";
import {
  getMaterialImagePublicUrl,
  getMaterialPreviewPublicUrl,
  materialImageStoragePath,
} from "@/lib/storagePaths";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const ALLOWED_EXTENSIONS = new Set<MaterialImageExtension>([
  "avif",
  "gif",
  "jpg",
  "png",
  "webp",
]);

export async function saveMaterialImageUpload(
  materialId: string,
  extension: MaterialImageExtension
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !materialId || !ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, error: "Некорректный файл изображения" };
  }

  const { data: material } = await supabase
    .from("materials")
    .select("id, material_type")
    .eq("id", materialId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!material || material.material_type !== "image") {
    return { ok: false, error: "Material должен иметь тип image" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return { ok: false, error: "Storage не настроен" };

  const storagePath = materialImageStoragePath(user.id, materialId, extension);
  const fileUrl = getMaterialImagePublicUrl(supabaseUrl, storagePath);
  const previewUrl = getMaterialPreviewPublicUrl(supabaseUrl, user.id, materialId);
  const { error } = await supabase
    .from("materials")
    .update({ file_url_or_path: fileUrl, preview_url: previewUrl })
    .eq("id", materialId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to save Material image URLs:", error.message);
    return { ok: false, error: "Не удалось сохранить изображение" };
  }

  revalidatePath("/materials");
  revalidatePath(`/materials/${materialId}`);

  const { data: links } = await supabase
    .from("document_materials")
    .select("document_id, documents(site_slug)")
    .eq("material_id", materialId)
    .eq("user_id", user.id);
  for (const link of links ?? []) {
    revalidatePath(`/documents/${link.document_id}`);
    const embedded = link.documents;
    const document = Array.isArray(embedded) ? embedded[0] : embedded;
    if (document?.site_slug) revalidatePath(`/p/${document.site_slug}`);
  }

  return { ok: true };
}
