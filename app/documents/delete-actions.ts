"use server";

import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { DOCUMENT_IMAGES_BUCKET } from "@/lib/storagePaths";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function deleteDraftDocument(
  documentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(COCKPIT_LOGIN_PATH);

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, site_status")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentError || !document) {
    return { ok: false, error: "Документ не найден" };
  }

  if (document.site_status === "published") {
    return { ok: false, error: "Опубликованный документ удалить нельзя" };
  }

  const { data: assets, error: assetsError } = await supabase
    .from("document_publication_images")
    .select("storage_path")
    .eq("document_id", documentId)
    .eq("user_id", user.id);

  if (assetsError) {
    console.error("Failed to load Document publication files:", assetsError.message);
    return { ok: false, error: "Не удалось подготовить документ к удалению" };
  }

  const storagePaths = (assets ?? [])
    .map((asset) => asset.storage_path)
    .filter(Boolean);

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(DOCUMENT_IMAGES_BUCKET)
      .remove(storagePaths);

    if (storageError) {
      console.error("Failed to delete Document publication files:", storageError.message);
      return { ok: false, error: "Не удалось удалить файлы документа" };
    }
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", user.id)
    .neq("site_status", "published");

  if (deleteError) {
    console.error("Failed to delete Document:", deleteError.message);
    return { ok: false, error: "Не удалось удалить документ" };
  }

  revalidatePath("/documents");
  revalidatePath("/today");
  return { ok: true };
}
