"use server";

import type { ActionResult } from "@/lib/actionResult";
import { isValidMaterialType } from "@/lib/materialTypes";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateActionContexts(documentId: string) {
  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/today");
}

function revalidateDocument(documentId: string) {
  revalidateActionContexts(documentId);
}

function revalidateMaterial(materialId: string, documentId?: string) {
  revalidatePath("/materials");
  revalidatePath(`/materials/${materialId}`);

  if (documentId) {
    revalidateDocument(documentId);
  }
}

async function linkDocumentMaterialRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documentId: string,
  materialId: string,
  userId: string
) {
  const { error } = await supabase.from("document_materials").insert({
    document_id: documentId,
    material_id: materialId,
    user_id: userId,
  });

  if (error && error.code !== "23505") {
    console.error("Failed to link material to document:", error.message);
    return false;
  }

  return true;
}

async function findExistingMaterialByTitle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  title: string,
  excludeId?: string
) {
  const normalized = title.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const { data, error } = await supabase
    .from("materials")
    .select("id, title, material_type")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to find material by title:", error.message);
    return null;
  }

  return (
    (data ?? []).find(
      (material) =>
        material.id !== excludeId &&
        material.title.trim().toLowerCase() === normalized
    ) ?? null
  );
}

async function findExistingDocumentByTitle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  title: string,
  excludeId?: string
) {
  const normalized = title.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, title")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to find document by title:", error.message);
    return null;
  }

  return (
    (data ?? []).find(
      (document) =>
        document.id !== excludeId &&
        document.title.trim().toLowerCase() === normalized
    ) ?? null
  );
}

export async function updateDocumentTitle(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!id) {
    return { ok: false, error: "not_found" };
  }

  if (!title) {
    return { ok: false, error: "empty" };
  }

  const duplicate = await findExistingDocumentByTitle(
    supabase,
    user.id,
    title,
    id
  );

  if (duplicate) {
    return { ok: false, error: "duplicate_title" };
  }

  const { error } = await supabase
    .from("documents")
    .update({ title })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "duplicate_title" };
    }

    console.error("Failed to update document title:", error.message);
    return { ok: false, error: "not_found" };
  }

  revalidateDocument(id);
  return { ok: true };
}

export async function updateMaterialTitle(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!id) {
    return { ok: false, error: "not_found" };
  }

  if (!title) {
    return { ok: false, error: "empty" };
  }

  const duplicate = await findExistingMaterialByTitle(
    supabase,
    user.id,
    title,
    id
  );

  if (duplicate) {
    return { ok: false, error: "duplicate_title" };
  }

  const { error } = await supabase
    .from("materials")
    .update({ title })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "duplicate_title" };
    }

    console.error("Failed to update material title:", error.message);
    return { ok: false, error: "not_found" };
  }

  revalidateMaterial(id);
  return { ok: true };
}

export async function updateMaterial(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { ok: false, error: "not_found" };
  }

  const updates: {
    material_type?: string;
    file_url_or_path?: string | null;
    notes?: string | null;
  } = {};

  if (formData.has("material_type")) {
    const material_type = String(formData.get("material_type") ?? "").trim();

    if (!isValidMaterialType(material_type)) {
      return { ok: false, error: "invalid_type" };
    }

    updates.material_type = material_type;
  }

  if (formData.has("file_url_or_path")) {
    const file_url_or_path = String(
      formData.get("file_url_or_path") ?? ""
    ).trim();
    updates.file_url_or_path = file_url_or_path || null;
  }

  if (formData.has("notes")) {
    const notes = String(formData.get("notes") ?? "").trim();
    updates.notes = notes || null;
  }

  if (Object.keys(updates).length === 0) {
    return { ok: true };
  }

  const { error } = await supabase
    .from("materials")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update material:", error.message);
    return { ok: false, error: "not_found" };
  }

  revalidateMaterial(id);
  return { ok: true };
}

export async function createDocument(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = String(formData.get("title") ?? "").trim();
  const document_type = String(formData.get("document_type") ?? "").trim();

  if (!title || !document_type) {
    return;
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      title,
      document_type,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create document:", error?.message);
    return;
  }

  revalidatePath("/documents");
  redirect(`/documents/${data.id}`);
}

export async function generateActions(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const documentId = String(formData.get("document_id") ?? "");
  if (!documentId) {
    return;
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, document_type")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentError || !document) {
    console.error("Failed to fetch document:", documentError?.message);
    return;
  }

  const { count, error: countError } = await supabase
    .from("actions")
    .select("*", { count: "exact", head: true })
    .eq("document_id", documentId)
    .eq("user_id", user.id);

  if (countError) {
    console.error("Failed to count actions:", countError.message);
    return;
  }

  if ((count ?? 0) > 0) {
    return;
  }

  const { data: template, error: templateError } = await supabase
    .from("workflow_templates_v2")
    .select("action_titles")
    .eq("document_type", document.document_type)
    .eq("user_id", user.id)
    .maybeSingle();

  if (templateError || !template) {
    console.error("Failed to fetch workflow template:", templateError?.message);
    return;
  }

  const rows = template.action_titles.map((title: string, index: number) => ({
    user_id: user.id,
    document_id: documentId,
    title,
    material_id: null,
    done: false,
    today: false,
    sort_order: index,
  }));

  if (rows.length === 0) {
    return;
  }

  const { error: insertError } = await supabase.from("actions").insert(rows);

  if (insertError) {
    console.error("Failed to generate actions:", insertError.message);
    return;
  }

  revalidateDocument(documentId);
}

export async function createAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const documentId = String(formData.get("document_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!documentId || !title) {
    return;
  }

  const { data: lastAction, error: sortError } = await supabase
    .from("actions")
    .select("sort_order")
    .eq("document_id", documentId)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sortError) {
    console.error("Failed to fetch action sort order:", sortError.message);
    return;
  }

  const sort_order = (lastAction?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("actions").insert({
    user_id: user.id,
    document_id: documentId,
    title,
    material_id: null,
    done: false,
    today: false,
    sort_order,
  });

  if (error) {
    console.error("Failed to create action:", error.message);
    return;
  }

  revalidateDocument(documentId);
}

export async function updateAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!id || !documentId || !title) {
    return;
  }

  const { error } = await supabase
    .from("actions")
    .update({ title })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("document_id", documentId);

  if (error) {
    console.error("Failed to update action:", error.message);
    return;
  }

  revalidateDocument(documentId);
}

export async function linkActionMaterial(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const actionId = String(formData.get("action_id") ?? "");
  const materialId = String(formData.get("material_id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");

  if (!actionId || !materialId || !documentId) {
    return;
  }

  const [
    { data: action, error: actionError },
    { data: material, error: materialError },
    { data: documentMaterial, error: documentMaterialError },
  ] = await Promise.all([
    supabase
      .from("actions")
      .select("id, document_id")
      .eq("id", actionId)
      .eq("user_id", user.id)
      .eq("document_id", documentId)
      .maybeSingle(),
    supabase
      .from("materials")
      .select("id")
      .eq("id", materialId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("document_materials")
      .select("id")
      .eq("document_id", documentId)
      .eq("material_id", materialId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (
    actionError ||
    materialError ||
    documentMaterialError ||
    !action ||
    !material ||
    !documentMaterial
  ) {
    console.error(
      "Failed to validate action/material link:",
      actionError?.message ??
        materialError?.message ??
        documentMaterialError?.message
    );
    return;
  }

  const { error } = await supabase.from("action_materials").insert({
    action_id: actionId,
    material_id: materialId,
    user_id: user.id,
  });

  if (error) {
    if (error.code !== "23505") {
      console.error("Failed to link action material:", error.message);
    }
    return;
  }

  revalidateDocument(documentId);
}

export async function unlinkActionMaterial(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const actionId = String(formData.get("action_id") ?? "");
  const materialId = String(formData.get("material_id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");

  if (!actionId || !materialId || !documentId) {
    return;
  }

  const { error } = await supabase
    .from("action_materials")
    .delete()
    .eq("action_id", actionId)
    .eq("material_id", materialId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to unlink action material:", error.message);
    return;
  }

  revalidateDocument(documentId);
}

export async function deleteAction(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");

  if (!id || !documentId) {
    return;
  }

  const { error } = await supabase
    .from("actions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("document_id", documentId);

  if (error) {
    console.error("Failed to delete action:", error.message);
    return;
  }

  revalidateDocument(documentId);
}

export async function toggleActionDone(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");
  const done = formData.get("done") === "true";

  if (!id || !documentId) {
    return;
  }

  const { error } = await supabase
    .from("actions")
    .update({ done })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("document_id", documentId);

  if (error) {
    console.error("Failed to toggle action done:", error.message);
    return;
  }

  revalidateActionContexts(documentId);
}

export async function toggleActionToday(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");
  const today = formData.get("today") === "true";

  if (!id || !documentId) {
    return;
  }

  const updatePayload: {
    today: boolean;
    today_sort_order: number | null;
  } = {
    today,
    today_sort_order: null,
  };

  if (today) {
    const { data: lastFocusAction, error: sortError } = await supabase
      .from("actions")
      .select("today_sort_order")
      .eq("user_id", user.id)
      .eq("today", true)
      .order("today_sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sortError) {
      console.error("Failed to fetch today sort order:", sortError.message);
      return;
    }

    updatePayload.today_sort_order = (lastFocusAction?.today_sort_order ?? -1) + 1;
  }

  const { error } = await supabase
    .from("actions")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("document_id", documentId);

  if (error) {
    console.error("Failed to toggle action today:", error.message);
    return;
  }

  revalidateActionContexts(documentId);
}

export async function reorderActions(
  documentId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!documentId || orderedIds.length === 0) {
    return;
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentError || !document) {
    console.error("Failed to fetch document:", documentError?.message);
    return;
  }

  const { data: existingActions, error: fetchError } = await supabase
    .from("actions")
    .select("id")
    .eq("document_id", documentId)
    .eq("user_id", user.id);

  if (fetchError) {
    console.error("Failed to fetch actions for reorder:", fetchError.message);
    return;
  }

  const existingIds = new Set((existingActions ?? []).map((action) => action.id));

  if (orderedIds.length !== existingIds.size) {
    return;
  }

  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      return;
    }
  }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("actions")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("document_id", documentId)
  );

  const results = await Promise.all(updates);

  for (const { error } of results) {
    if (error) {
      console.error("Failed to reorder actions:", error.message);
      return;
    }
  }

  revalidateDocument(documentId);
}

export async function reorderTodayActions(
  orderedIds: string[]
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (orderedIds.length === 0) {
    return;
  }

  const { data: existingActions, error: fetchError } = await supabase
    .from("actions")
    .select("id")
    .eq("today", true)
    .eq("user_id", user.id);

  if (fetchError) {
    console.error("Failed to fetch today actions for reorder:", fetchError.message);
    return;
  }

  const existingIds = new Set((existingActions ?? []).map((action) => action.id));

  if (orderedIds.length !== existingIds.size) {
    return;
  }

  for (const id of orderedIds) {
    if (!existingIds.has(id)) {
      return;
    }
  }

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("actions")
      .update({ today_sort_order: index })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("today", true)
  );

  const results = await Promise.all(updates);

  for (const { error } of results) {
    if (error) {
      console.error("Failed to reorder today actions:", error.message);
      return;
    }
  }

  revalidatePath("/today");
}

export async function linkMaterialToDocument(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const documentId = String(formData.get("document_id") ?? "");
  const materialId = String(formData.get("material_id") ?? "");

  if (!documentId || !materialId) {
    return;
  }

  const [{ data: document, error: documentError }, { data: material, error: materialError }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id")
        .eq("id", documentId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("materials")
        .select("id")
        .eq("id", materialId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (documentError || materialError || !document || !material) {
    console.error(
      "Failed to validate document/material link:",
      documentError?.message ?? materialError?.message
    );
    return;
  }

  const { error } = await supabase.from("document_materials").insert({
    document_id: documentId,
    material_id: materialId,
    user_id: user.id,
  });

  if (error) {
    if (error.code !== "23505") {
      console.error("Failed to link material to document:", error.message);
    }
    return;
  }

  revalidateMaterial(materialId, documentId);
}

export async function findMaterialByTitle(title: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return findExistingMaterialByTitle(supabase, user.id, title);
}

export async function unlinkMaterialFromDocument(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const documentId = String(formData.get("document_id") ?? "");
  const materialId = String(formData.get("material_id") ?? "");

  if (!documentId || !materialId) {
    return { ok: false, error: "not_found" };
  }

  const { count, error: countError } = await supabase
    .from("document_materials")
    .select("*", { count: "exact", head: true })
    .eq("material_id", materialId)
    .eq("user_id", user.id);

  if (countError) {
    console.error("Failed to count document links:", countError.message);
    return { ok: false, error: "not_found" };
  }

  if ((count ?? 0) <= 1) {
    return { ok: false, error: "last_document" };
  }

  const { error } = await supabase
    .from("document_materials")
    .delete()
    .eq("document_id", documentId)
    .eq("material_id", materialId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to unlink material from document:", error.message);
    return { ok: false, error: "not_found" };
  }

  revalidateMaterial(materialId, documentId);
  return { ok: true };
}

export async function searchMaterials(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const { data, error } = await supabase
    .from("materials")
    .select("id, title, material_type")
    .eq("user_id", user.id)
    .ilike("title", `%${trimmed}%`)
    .order("title", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Failed to search materials:", error.message);
    return [];
  }

  return data ?? [];
}

export async function createMaterial(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const documentId = String(formData.get("document_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const material_type = String(formData.get("material_type") ?? "").trim();
  const file_url_or_path = String(formData.get("file_url_or_path") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const redirectTarget = String(formData.get("redirect") ?? "");

  if (!documentId || !title || !material_type) {
    return;
  }

  if (!isValidMaterialType(material_type)) {
    return;
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentError || !document) {
    console.error("Failed to fetch document:", documentError?.message);
    return;
  }

  const existingMaterial = await findExistingMaterialByTitle(
    supabase,
    user.id,
    title
  );

  if (existingMaterial) {
    const linked = await linkDocumentMaterialRecord(
      supabase,
      documentId,
      existingMaterial.id,
      user.id
    );

    if (!linked) {
      return;
    }

    revalidateMaterial(existingMaterial.id, documentId);

    if (redirectTarget === "materials") {
      redirect(`/materials/${existingMaterial.id}`);
    }

    return;
  }

  const { data: material, error: materialError } = await supabase
    .from("materials")
    .insert({
      user_id: user.id,
      document_id: documentId,
      title,
      material_type,
      file_url_or_path: file_url_or_path || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (materialError || !material) {
    if (materialError?.code === "23505") {
      const duplicate = await findExistingMaterialByTitle(supabase, user.id, title);

      if (duplicate) {
        await linkDocumentMaterialRecord(
          supabase,
          documentId,
          duplicate.id,
          user.id
        );
        revalidateMaterial(duplicate.id, documentId);

        if (redirectTarget === "materials") {
          redirect(`/materials/${duplicate.id}`);
        }
      }

      return;
    }

    console.error("Failed to create material:", materialError?.message);
    return;
  }

  const linked = await linkDocumentMaterialRecord(
    supabase,
    documentId,
    material.id,
    user.id
  );

  if (!linked) {
    return;
  }

  revalidateMaterial(material.id, documentId);

  if (redirectTarget === "materials") {
    redirect(`/materials/${material.id}`);
  }
}

