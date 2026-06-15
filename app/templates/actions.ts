"use server";

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

export async function createWorkflowTemplate(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const document_type = parseDocumentType(formData);
  const action_titles = parseActionTitlesFromForm(formData);

  if (!document_type) {
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

  revalidatePath("/templates");
  redirect("/templates");
}

export async function updateWorkflowTemplate(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  const document_type = parseDocumentType(formData);
  const action_titles = parseActionTitlesFromForm(formData);

  if (!id || !document_type) {
    return;
  }

  const { error } = await supabase
    .from("workflow_templates_v2")
    .update({ document_type, action_titles })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update workflow template:", error.message);
    return;
  }

  revalidatePath("/templates");
  revalidatePath(`/templates/${id}/edit`);
  redirect("/templates");
}

export async function deleteWorkflowTemplate(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) {
    return;
  }

  const { error } = await supabase
    .from("workflow_templates_v2")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete workflow template:", error.message);
    return;
  }

  revalidatePath("/templates");
  redirect("/templates");
}
