"use server";

import {
  downloadPublicationImage,
  optimizePublicationImage,
} from "@/lib/documentPublicationImage";
import {
  DOCUMENT_IMAGES_BUCKET,
  documentImageStoragePath,
  getDocumentImagePublicUrl,
} from "@/lib/storagePaths";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type PublicationImageResult =
  | { ok: true }
  | { ok: false; error: string };

async function getContext(documentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: document } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  return document ? { supabase, user } : null;
}

async function getMaterialSource(
  documentId: string,
  materialId: string
): Promise<
  | { ok: true; source: string; title: string }
  | { ok: false; error: string }
> {
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };

  const { data: link } = await context.supabase
    .from("document_materials")
    .select("material_id, materials(id, title, material_type, file_url_or_path)")
    .eq("document_id", documentId)
    .eq("material_id", materialId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  const embedded = link?.materials;
  const material = Array.isArray(embedded) ? embedded[0] : embedded;

  if (!material || material.material_type !== "image") {
    return { ok: false, error: "Выберите связанный Material типа image" };
  }

  const source = material.file_url_or_path?.trim();
  if (!source) {
    return { ok: false, error: "У Material не указан источник изображения" };
  }

  return { ok: true, source, title: material.title };
}

async function uploadPreparedImage({
  documentId,
  userId,
  assetId,
  input,
}: {
  documentId: string;
  userId: string;
  assetId: string;
  input: Buffer | ArrayBuffer;
}) {
  const supabase = await createClient();
  const prepared = await optimizePublicationImage(input);
  const storagePath = documentImageStoragePath(userId, documentId, assetId);
  const { error } = await supabase.storage
    .from(DOCUMENT_IMAGES_BUCKET)
    .upload(storagePath, prepared.bytes, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) throw new Error(`storage_upload_failed:${error.message}`);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("missing_supabase_url");

  return {
    storagePath,
    imageUrl: getDocumentImagePublicUrl(supabaseUrl, storagePath),
    width: prepared.width,
    height: prepared.height,
  };
}

async function saveCover({
  documentId,
  sourceMaterialId,
  alt,
  input,
}: {
  documentId: string;
  sourceMaterialId: string;
  alt: string;
  input: Buffer | ArrayBuffer;
}): Promise<PublicationImageResult> {
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };

  const candidateId = crypto.randomUUID();
  let uploadedPath: string | null = null;

  try {
    const prepared = await uploadPreparedImage({
      documentId,
      userId: context.user.id,
      assetId: candidateId,
      input,
    });
    uploadedPath = prepared.storagePath;

    const { data: existing } = await context.supabase
      .from("document_publication_images")
      .select("id, storage_path")
      .eq("document_id", documentId)
      .eq("role", "cover")
      .eq("user_id", context.user.id)
      .maybeSingle();

    const values = {
      source_material_id: sourceMaterialId,
      title: null,
      alt,
      storage_path: prepared.storagePath,
      image_url: prepared.imageUrl,
      width: prepared.width,
      height: prepared.height,
      status: "ready",
      error: null,
    };
    const query = existing
      ? context.supabase
          .from("document_publication_images")
          .update(values)
          .eq("id", existing.id)
          .eq("user_id", context.user.id)
      : context.supabase.from("document_publication_images").insert({
          id: candidateId,
          user_id: context.user.id,
          document_id: documentId,
          role: "cover",
          sort_order: 0,
          ...values,
        });
    const { error } = await query;
    if (error) throw new Error(`database_save_failed:${error.message}`);

    if (existing?.storage_path && existing.storage_path !== uploadedPath) {
      await context.supabase.storage
        .from(DOCUMENT_IMAGES_BUCKET)
        .remove([existing.storage_path]);
    }

    revalidatePath(`/documents/${documentId}`);
    return { ok: true };
  } catch (error) {
    if (uploadedPath) {
      await context.supabase.storage
        .from(DOCUMENT_IMAGES_BUCKET)
        .remove([uploadedPath]);
    }
    console.error("Failed to prepare cover:", error);
    return { ok: false, error: "Не удалось подготовить обложку" };
  }
}

export async function makeDocumentCoverFromMaterial(
  documentId: string,
  materialId: string
): Promise<PublicationImageResult> {
  const material = await getMaterialSource(documentId, materialId);
  if (!material.ok) return material;

  try {
    const input = await downloadPublicationImage(material.source);
    return saveCover({
      documentId,
      sourceMaterialId: materialId,
      alt: material.title,
      input,
    });
  } catch (error) {
    console.error("Failed to download cover source:", error);
    return { ok: false, error: "Не удалось получить исходное изображение" };
  }
}

export async function addDocumentIllustrationFromMaterial(
  documentId: string,
  materialId: string
): Promise<PublicationImageResult> {
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };
  const material = await getMaterialSource(documentId, materialId);
  if (!material.ok) return material;

  const assetId = crypto.randomUUID();
  let storagePath: string | null = null;

  try {
    const input = await downloadPublicationImage(material.source);
    const prepared = await uploadPreparedImage({
      documentId,
      userId: context.user.id,
      assetId,
      input,
    });
    storagePath = prepared.storagePath;
    const { data: last } = await context.supabase
      .from("document_publication_images")
      .select("sort_order")
      .eq("document_id", documentId)
      .eq("role", "illustration")
      .eq("user_id", context.user.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await context.supabase
      .from("document_publication_images")
      .insert({
        id: assetId,
        user_id: context.user.id,
        document_id: documentId,
        source_material_id: materialId,
        role: "illustration",
        title: material.title,
        alt: material.title,
        sort_order: (last?.sort_order ?? -1) + 1,
        storage_path: prepared.storagePath,
        image_url: prepared.imageUrl,
        width: prepared.width,
        height: prepared.height,
        status: "ready",
      });
    if (error) throw new Error(`database_save_failed:${error.message}`);

    revalidatePath(`/documents/${documentId}`);
    return { ok: true };
  } catch (error) {
    if (storagePath) {
      await context.supabase.storage
        .from(DOCUMENT_IMAGES_BUCKET)
        .remove([storagePath]);
    }
    console.error("Failed to create illustration:", error);
    return { ok: false, error: "Не удалось подготовить иллюстрацию" };
  }
}

export async function updateDocumentPublicationImage(
  formData: FormData
): Promise<PublicationImageResult> {
  const id = String(formData.get("id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");
  const context = await getContext(documentId);
  if (!context || !id) return { ok: false, error: "Изображение не найдено" };

  const updates: { alt: string; title?: string | null } = {
    alt: String(formData.get("alt") ?? "").trim(),
  };
  if (formData.has("title")) {
    updates.title = String(formData.get("title") ?? "").trim() || null;
  }
  const { error } = await context.supabase
    .from("document_publication_images")
    .update(updates)
    .eq("id", id)
    .eq("document_id", documentId)
    .eq("user_id", context.user.id);

  if (error) return { ok: false, error: "Не удалось сохранить поля" };
  revalidatePath(`/documents/${documentId}`);
  return { ok: true };
}

export async function reorderDocumentIllustrations(
  documentId: string,
  orderedIds: string[]
): Promise<PublicationImageResult> {
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };

  const { data: rows } = await context.supabase
    .from("document_publication_images")
    .select("id")
    .eq("document_id", documentId)
    .eq("role", "illustration")
    .eq("user_id", context.user.id);
  const allowed = new Set((rows ?? []).map((row) => row.id));
  if (orderedIds.length !== allowed.size || orderedIds.some((id) => !allowed.has(id))) {
    return { ok: false, error: "Некорректный порядок" };
  }

  const results = await Promise.all(
    orderedIds.map((id, sortOrder) =>
      context.supabase
        .from("document_publication_images")
        .update({ sort_order: sortOrder })
        .eq("id", id)
        .eq("user_id", context.user.id)
    )
  );
  if (results.some(({ error }) => error)) {
    return { ok: false, error: "Не удалось сохранить порядок" };
  }
  revalidatePath(`/documents/${documentId}`);
  return { ok: true };
}

export async function removeDocumentPublicationImage(
  documentId: string,
  assetId: string
): Promise<PublicationImageResult> {
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };

  const { data: asset } = await context.supabase
    .from("document_publication_images")
    .select("storage_path")
    .eq("id", assetId)
    .eq("document_id", documentId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!asset) return { ok: false, error: "Изображение не найдено" };

  const { error } = await context.supabase
    .from("document_publication_images")
    .delete()
    .eq("id", assetId)
    .eq("user_id", context.user.id);
  if (error) return { ok: false, error: "Не удалось удалить изображение" };

  const { error: storageError } = await context.supabase.storage
    .from(DOCUMENT_IMAGES_BUCKET)
    .remove([asset.storage_path]);
  if (storageError) console.error("Failed to remove publication image:", storageError.message);

  revalidatePath(`/documents/${documentId}`);
  return { ok: true };
}
