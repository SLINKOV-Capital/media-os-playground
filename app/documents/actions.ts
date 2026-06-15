"use server";

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
  const materialIdRaw = String(formData.get("material_id") ?? "");
  const material_id = materialIdRaw === "" ? null : materialIdRaw;

  if (!id || !documentId || !title) {
    return;
  }

  const { error } = await supabase
    .from("actions")
    .update({ title, material_id })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("document_id", documentId);

  if (error) {
    console.error("Failed to update action:", error.message);
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

  const { error } = await supabase
    .from("actions")
    .update({ today })
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

  if (!documentId || !title || !material_type) {
    return;
  }

  const { error } = await supabase.from("materials").insert({
    user_id: user.id,
    document_id: documentId,
    title,
    material_type,
    file_url_or_path: file_url_or_path || null,
    notes: notes || null,
  });

  if (error) {
    console.error("Failed to create material:", error.message);
    return;
  }

  revalidateDocument(documentId);
}
