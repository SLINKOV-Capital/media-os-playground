"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

async function getContext(documentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: document } = await supabase
    .from("documents")
    .select("id, document_type, site_slug")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  return document ? { supabase, user, document } : null;
}

function revalidate(documentId: string, slug: string | null) {
  revalidatePath(`/documents/${documentId}`);
  if (slug) revalidatePath(`/p/${slug}`);
}

export async function addDocumentRecommendation(
  documentId: string,
  recommendedDocumentId: string
): Promise<Result> {
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };
  if (!recommendedDocumentId || recommendedDocumentId === documentId) {
    return { ok: false, error: "Выберите другой Document" };
  }

  const { data: target } = await context.supabase
    .from("documents")
    .select("id")
    .eq("id", recommendedDocumentId)
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (!target) return { ok: false, error: "Document не найден" };

  const { data: last } = await context.supabase
    .from("document_recommendations")
    .select("sort_order")
    .eq("document_id", documentId)
    .eq("user_id", context.user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await context.supabase.from("document_recommendations").insert({
    document_id: documentId,
    recommended_document_id: recommendedDocumentId,
    user_id: context.user.id,
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Document уже добавлен" : "Не удалось добавить рекомендацию" };
  }

  revalidate(documentId, context.document.site_slug);
  return { ok: true };
}

export async function removeDocumentRecommendation(
  documentId: string,
  recommendationId: string
): Promise<Result> {
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };
  const { error } = await context.supabase
    .from("document_recommendations")
    .delete()
    .eq("id", recommendationId)
    .eq("document_id", documentId)
    .eq("user_id", context.user.id);
  if (error) return { ok: false, error: "Не удалось удалить рекомендацию" };
  revalidate(documentId, context.document.site_slug);
  return { ok: true };
}

export async function reorderDocumentRecommendations(
  documentId: string,
  orderedIds: string[]
): Promise<Result> {
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };
  const updates = await Promise.all(
    orderedIds.map((id, sort_order) =>
      context.supabase.from("document_recommendations").update({ sort_order })
        .eq("id", id).eq("document_id", documentId).eq("user_id", context.user.id)
    )
  );
  if (updates.some(({ error }) => error)) return { ok: false, error: "Не удалось изменить порядок" };
  revalidate(documentId, context.document.site_slug);
  return { ok: true };
}

export async function addDocumentTerm(formData: FormData): Promise<Result> {
  const documentId = String(formData.get("document_id") ?? "");
  const term = String(formData.get("term") ?? "").trim();
  const definition = String(formData.get("definition") ?? "").trim();
  const explained = String(formData.get("explained_in_document_id") ?? "").trim() || null;
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };
  if (!context.document.document_type.toLowerCase().includes("стат")) {
    return { ok: false, error: "Термины доступны только для статьи" };
  }
  if (!term || !definition) return { ok: false, error: "Заполните термин и определение" };

  const { data: last } = await context.supabase.from("document_terms").select("sort_order")
    .eq("document_id", documentId).eq("user_id", context.user.id)
    .order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const { error } = await context.supabase.from("document_terms").insert({
    document_id: documentId, user_id: context.user.id, term, definition,
    explained_in_document_id: explained, sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) return { ok: false, error: error.code === "23505" ? "Такой термин уже добавлен" : "Не удалось добавить термин" };
  revalidate(documentId, context.document.site_slug);
  return { ok: true };
}

export async function updateDocumentTerm(formData: FormData): Promise<Result> {
  const documentId = String(formData.get("document_id") ?? "");
  const id = String(formData.get("id") ?? "");
  const term = String(formData.get("term") ?? "").trim();
  const definition = String(formData.get("definition") ?? "").trim();
  const explained = String(formData.get("explained_in_document_id") ?? "").trim() || null;
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };
  if (!term || !definition) return { ok: false, error: "Заполните термин и определение" };
  const { error } = await context.supabase.from("document_terms")
    .update({ term, definition, explained_in_document_id: explained })
    .eq("id", id).eq("document_id", documentId).eq("user_id", context.user.id);
  if (error) return { ok: false, error: error.code === "23505" ? "Такой термин уже добавлен" : "Не удалось сохранить термин" };
  revalidate(documentId, context.document.site_slug);
  return { ok: true };
}

export async function removeDocumentTerm(documentId: string, id: string): Promise<Result> {
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };
  const { error } = await context.supabase.from("document_terms").delete()
    .eq("id", id).eq("document_id", documentId).eq("user_id", context.user.id);
  if (error) return { ok: false, error: "Не удалось удалить термин" };
  revalidate(documentId, context.document.site_slug);
  return { ok: true };
}

export async function reorderDocumentTerms(documentId: string, orderedIds: string[]): Promise<Result> {
  const context = await getContext(documentId);
  if (!context) return { ok: false, error: "Документ не найден" };
  const updates = await Promise.all(orderedIds.map((id, sort_order) =>
    context.supabase.from("document_terms").update({ sort_order })
      .eq("id", id).eq("document_id", documentId).eq("user_id", context.user.id)
  ));
  if (updates.some(({ error }) => error)) return { ok: false, error: "Не удалось изменить порядок" };
  revalidate(documentId, context.document.site_slug);
  return { ok: true };
}
