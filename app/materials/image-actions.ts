"use server";

import type { MaterialImageExtension } from "@/lib/storagePaths";
import {
  getMaterialImagePublicUrl,
  getMaterialPreviewPublicUrl,
  materialImageStoragePath,
} from "@/lib/storagePaths";
import { createClient } from "@/lib/supabase/server";
import { publicCandidateDocumentPaths } from "@/lib/site";
import { revalidatePath } from "next/cache";

const ALLOWED_EXTENSIONS = new Set<MaterialImageExtension>([
  "avif",
  "gif",
  "jpg",
  "png",
  "webp",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CreateUploadedImageMaterialInput = {
  materialId: string;
  documentId: string;
  actionId?: string;
  title: string;
  extension: MaterialImageExtension;
};

export async function getMaterialUploadUserId(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user
    ? { ok: true, userId: user.id }
    : { ok: false, error: "Требуется авторизация" };
}

export async function createUploadedImageMaterial({
  materialId,
  documentId,
  actionId,
  title,
  extension,
}: CreateUploadedImageMaterialInput): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cleanTitle = title.trim();

  if (
    !user ||
    !UUID_PATTERN.test(materialId) ||
    !UUID_PATTERN.test(documentId) ||
    !cleanTitle ||
    !ALLOWED_EXTENSIONS.has(extension)
  ) {
    return { ok: false, error: "Некорректные данные изображения" };
  }

  const { data: document } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!document) return { ok: false, error: "Документ не найден" };

  if (actionId) {
    const { data: action } = await supabase
      .from("actions")
      .select("id")
      .eq("id", actionId)
      .eq("document_id", documentId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!action) return { ok: false, error: "Действие не найдено" };
  }

  const { data: materials } = await supabase
    .from("materials")
    .select("id, title")
    .eq("user_id", user.id);
  const duplicate = (materials ?? []).find(
    (material) => material.title.trim().toLowerCase() === cleanTitle.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, error: "Material с таким названием уже существует" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return { ok: false, error: "Storage не настроен" };
  const storagePath = materialImageStoragePath(user.id, materialId, extension);
  const fileUrl = getMaterialImagePublicUrl(supabaseUrl, storagePath);
  const previewUrl = getMaterialPreviewPublicUrl(supabaseUrl, user.id, materialId);

  const { error: materialError } = await supabase.from("materials").insert({
    id: materialId,
    user_id: user.id,
    title: cleanTitle,
    material_type: "image",
    file_url_or_path: fileUrl,
    preview_url: previewUrl,
  });
  if (materialError) {
    console.error("Failed to create uploaded image Material:", materialError.message);
    return {
      ok: false,
      error:
        materialError.code === "23505"
          ? "Material с таким названием уже существует"
          : "Не удалось сохранить Material",
    };
  }

  const { error: linkError } = await supabase.from("document_materials").insert({
    document_id: documentId,
    material_id: materialId,
    user_id: user.id,
  });
  if (linkError) {
    await supabase.from("materials").delete().eq("id", materialId).eq("user_id", user.id);
    console.error("Failed to link uploaded image Material:", linkError.message);
    return { ok: false, error: "Не удалось связать Material с документом" };
  }

  if (actionId) {
    const { error: actionLinkError } = await supabase.from("action_materials").insert({
      action_id: actionId,
      material_id: materialId,
      user_id: user.id,
    });
    if (actionLinkError) {
      await supabase
        .from("document_materials")
        .delete()
        .eq("document_id", documentId)
        .eq("material_id", materialId)
        .eq("user_id", user.id);
      await supabase.from("materials").delete().eq("id", materialId).eq("user_id", user.id);
      console.error("Failed to link uploaded image to action:", actionLinkError.message);
      return { ok: false, error: "Не удалось связать Material с действием" };
    }
  }

  revalidatePath("/materials");
  revalidatePath(`/materials/${materialId}`);
  revalidatePath(`/documents/${documentId}`);
  return { ok: true };
}

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
    if (document?.site_slug) {
      for (const path of publicCandidateDocumentPaths(document.site_slug)) {
        revalidatePath(path);
      }
    }
  }

  return { ok: true };
}
