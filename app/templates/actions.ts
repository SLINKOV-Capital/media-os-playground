"use server";

import type { ActionResult } from "@/lib/actionResult";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseActionTitles(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseDocumentType(formData: FormData): string {
  return String(formData.get("document_type") ?? "").trim();
}

function parseActionTitlesFromForm(formData: FormData): string[] {
  return parseActionTitles(String(formData.get("action_titles") ?? ""));
}

function mapRenameDocumentTypeError(message: string): ActionResult {
  if (message.includes("duplicate_type")) {
    return { ok: false, error: "duplicate_type" };
  }

  if (message.includes("empty_type")) {
    return { ok: false, error: "empty" };
  }

  if (message.includes("template_not_found")) {
    return { ok: false, error: "not_found" };
  }

  return { ok: false, error: "not_found" };
}

async function findExistingTemplateByDocumentType(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  documentType: string,
  excludeId?: string
) {
  const normalized = documentType.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const { data, error } = await supabase
    .from("workflow_templates_v2")
    .select("id, document_type")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to find template by document type:", error.message);
    return null;
  }

  return (
    (data ?? []).find(
      (template) =>
        template.id !== excludeId &&
        template.document_type.trim().toLowerCase() === normalized
    ) ?? null
  );
}

function revalidateDocumentTypePaths() {
  revalidatePath("/templates");
  revalidatePath("/documents");
  revalidatePath("/documents/new");
}

export async function updateTemplateTitle(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!id) {
    return { ok: false, error: "not_found" };
  }

  if (!title) {
    return { ok: false, error: "empty" };
  }

  const { error } = await supabase.rpc("rename_document_type", {
    p_template_id: id,
    p_new_document_type: title,
  });

  if (error) {
    console.error("Failed to rename document type:", error.message);
    return mapRenameDocumentTypeError(error.message);
  }

  revalidateDocumentTypePaths();
  revalidatePath(`/templates/${id}/edit`);
  return { ok: true };
}

export async function createWorkflowTemplate(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const document_type = parseDocumentType(formData);
  const action_titles = parseActionTitlesFromForm(formData);

  if (!document_type) {
    return;
  }

  const duplicate = await findExistingTemplateByDocumentType(
    supabase,
    user.id,
    document_type
  );

  if (duplicate) {
    console.error("Duplicate document type on template create");
    return;
  }

  const { error } = await supabase.from("workflow_templates_v2").insert({
    user_id: user.id,
    document_type,
    action_titles,
  });

  if (error) {
    console.error("Failed to create workflow template:", error.message);
    return;
  }

  revalidateDocumentTypePaths();
  redirect("/templates");
}

export async function updateWorkflowTemplate(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const id = String(formData.get("id") ?? "");
  const document_type = parseDocumentType(formData);
  const action_titles = parseActionTitlesFromForm(formData);

  if (!id || !document_type) {
    return;
  }

  const { data: existing, error: existingError } = await supabase
    .from("workflow_templates_v2")
    .select("document_type")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError || !existing) {
    console.error("Failed to fetch template:", existingError?.message);
    return;
  }

  const typeChanged =
    existing.document_type.trim().toLowerCase() !==
    document_type.trim().toLowerCase();

  if (typeChanged) {
    const { error: renameError } = await supabase.rpc("rename_document_type", {
      p_template_id: id,
      p_new_document_type: document_type,
    });

    if (renameError) {
      console.error("Failed to rename document type:", renameError.message);
      return;
    }
  }

  const { error } = await supabase
    .from("workflow_templates_v2")
    .update({ action_titles })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update workflow template:", error.message);
    return;
  }

  revalidateDocumentTypePaths();
  revalidatePath(`/templates/${id}/edit`);
  redirect("/templates");
}

export async function deleteWorkflowTemplate(
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const id = String(formData.get("id") ?? "");

  if (!id) {
    return { ok: false, error: "not_found" };
  }

  const { data: template, error: templateError } = await supabase
    .from("workflow_templates_v2")
    .select("document_type")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (templateError || !template) {
    console.error("Failed to fetch template:", templateError?.message);
    return { ok: false, error: "not_found" };
  }

  const { count, error: countError } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("document_type", template.document_type);

  if (countError) {
    console.error("Failed to count documents by type:", countError.message);
    return { ok: false, error: "not_found" };
  }

  if ((count ?? 0) > 0) {
    return { ok: false, error: "type_in_use", count: count ?? 0 };
  }

  const { error } = await supabase
    .from("workflow_templates_v2")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete workflow template:", error.message);
    return { ok: false, error: "not_found" };
  }

  revalidateDocumentTypePaths();
  redirect("/templates");
}
