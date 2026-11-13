"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATEGORIES, type Category } from "@/lib/workCategories";
import { findDuplicateProjectName } from "@/lib/mcpProjectWorkflow";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function context() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/slinkov-cockpit-login");
  return { supabase, user };
}

export async function saveCard(formData: FormData): Promise<boolean> {
  const { supabase, user } = await context();
  const kind = String(formData.get("kind"));
  const id = String(formData.get("id") || "");
  const submissionId = String(formData.get("submission_id") || "");
  const title = String(formData.get("title") || "").trim();
  const requestedCategory = String(formData.get("category") || "intentions") as Category;
  const category = kind === "project" ? "projects" : requestedCategory;
  if (!title || !CATEGORIES.includes(category) || !["project", "task"].includes(kind) || (submissionId && !UUID_RE.test(submissionId))) return false;
  const values = kind === "project"
    ? { name: title, description: String(formData.get("description") || ""), category }
    : { title, description: String(formData.get("description") || ""), notes: String(formData.get("description") || ""), category,
        project_id: String(formData.get("project_id") || "") || null,
        due_date: String(formData.get("due_date") || "") || null,
        event_at: String(formData.get("event_at") || "") ? `${String(formData.get("event_at"))}:00+03:00` : null };
  if (kind === "task" && values.project_id) {
    const { data: parent } = await supabase.from("projects").select("id").eq("id", values.project_id).eq("user_id", user.id).maybeSingle();
    if (!parent) return false;
  }
  if (kind === "project") {
    const projectValues = values as { name: string; description: string; category: Category };
    if (id) {
      const { data: duplicates } = await supabase.from("projects").select("id,name").eq("user_id", user.id).neq("id", id);
      if (findDuplicateProjectName(title, duplicates ?? [], { id })) return false;
      await supabase.from("projects").update(projectValues).eq("id", id).eq("user_id", user.id);
    }
    else {
      const [{ data }, { data: duplicates }] = await Promise.all([
        supabase.from("projects").select("sort_order").eq("user_id", user.id).eq("category", "projects").order("sort_order", { ascending: false }).limit(1),
        supabase.from("projects").select("id,name,submission_id").eq("user_id", user.id),
      ]);
      if (findDuplicateProjectName(title, duplicates ?? [], { submission_id: submissionId || undefined })) return false;
      const row = { ...projectValues, user_id: user.id, sort_order: (data?.[0]?.sort_order ?? -1) + 1, ...(submissionId ? { submission_id: submissionId } : {}) };
      const { error } = submissionId
        ? await supabase.from("projects").upsert(row, { onConflict: "user_id,submission_id", ignoreDuplicates: true })
        : await supabase.from("projects").insert(row);
      if (error) throw new Error(`Failed to save manager project: ${error.message}`);
    }
  } else {
    const taskValues = values as { title: string; description: string; notes: string; category: Category; project_id: string | null; due_date: string | null; event_at: string | null };
    if (id) await supabase.from("tasks").update(taskValues).eq("id", id).eq("user_id", user.id);
    else {
      const { data } = await supabase.from("tasks").select("sort_order").eq("user_id", user.id).eq("category", category).order("sort_order", { ascending: false }).limit(1);
      const row = { ...taskValues, user_id: user.id, sort_order: (data?.[0]?.sort_order ?? -1) + 1, ...(submissionId ? { submission_id: submissionId } : {}) };
      const { error } = submissionId
        ? await supabase.from("tasks").upsert(row, { onConflict: "user_id,submission_id", ignoreDuplicates: true })
        : await supabase.from("tasks").insert(row);
      if (error) throw new Error(`Failed to save manager task: ${error.message}`);
    }
  }
  revalidatePath("/manager"); revalidatePath("/today");
  return true;
}

export async function deleteCard(formData: FormData) {
  const { supabase, user } = await context();
  const kind = String(formData.get("kind"));
  const table = kind === "project" ? "projects" : "tasks";
  if (!["project", "task"].includes(kind)) return;
  await supabase.from(table).update({ archived_at: new Date().toISOString() }).eq("id", String(formData.get("id"))).eq("user_id", user.id).is("archived_at", null);
  revalidatePath("/manager"); revalidatePath("/manager/archive"); revalidatePath("/today");
}

export async function restoreArchivedCard(formData: FormData) {
  const { supabase, user } = await context();
  const kind = String(formData.get("kind"));
  const table = kind === "project" ? "projects" : kind === "task" ? "tasks" : null;
  if (!table) return;
  await supabase.from(table).update({ archived_at: null }).eq("id", String(formData.get("id"))).eq("user_id", user.id).not("archived_at", "is", null);
  revalidatePath("/manager"); revalidatePath("/manager/archive"); revalidatePath("/today");
}

export async function reorderCards(payload: { category: Category; items: { kind: "project" | "task"; id: string }[] }) {
  const { supabase, user } = await context();
  if (!CATEGORIES.includes(payload.category) || payload.items.length > 500 || (payload.category !== "projects" && payload.items.some((item) => item.kind === "project"))) return;
  await Promise.all(payload.items.map(({kind,id},sort_order) => supabase.from(kind === "project" ? "projects" : "tasks").update({ category: payload.category, sort_order }).eq("id", id).eq("user_id", user.id)));
  revalidatePath("/manager");
}

export async function saveAction(formData: FormData): Promise<boolean> {
  const { supabase, user } = await context();
  const id = String(formData.get("id") || "");
  const submissionId = String(formData.get("submission_id") || "");
  const task_id = String(formData.get("task_id") || "");
  const title = String(formData.get("title") || "").trim();
  if (!task_id || !title || (submissionId && !UUID_RE.test(submissionId))) return false;
  const { data: task } = await supabase.from("tasks").select("id").eq("id", task_id).eq("user_id", user.id).maybeSingle();
  if (!task) return false;
  const values = { title, description: String(formData.get("description") || ""), task_id, due_date: String(formData.get("due_date") || "") || null };
  if (id) await supabase.from("actions").update(values).eq("id", id).eq("user_id", user.id);
  else {
    const { data } = await supabase.from("actions").select("sort_order").eq("task_id", task_id).order("sort_order", { ascending: false }).limit(1);
    const row = { ...values, user_id: user.id, sort_order: (data?.[0]?.sort_order ?? -1) + 1, ...(submissionId ? { submission_id: submissionId } : {}) };
    const { error } = submissionId
      ? await supabase.from("actions").upsert(row, { onConflict: "user_id,submission_id", ignoreDuplicates: true })
      : await supabase.from("actions").insert(row);
    if (error) throw new Error(`Failed to save manager action: ${error.message}`);
  }
  revalidatePath("/manager"); revalidatePath("/today");
  return true;
}

export async function toggleTask(formData: FormData) {
  const { supabase, user } = await context(); const id = String(formData.get("id"));
  const { data } = await supabase.from("tasks").select("completed").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (data) await supabase.from("tasks").update({ completed: !data.completed }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/manager"); revalidatePath("/today");
}

export async function toggleAction(formData: FormData) {
  const { supabase, user } = await context(); const id = String(formData.get("id"));
  const { data } = await supabase.from("actions").select("done").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (data) await supabase.from("actions").update({ done: !data.done }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/manager"); revalidatePath("/today");
}

export async function deleteAction(formData: FormData) {
  const { supabase, user } = await context();
  await supabase.from("actions").delete().eq("id", String(formData.get("id"))).eq("user_id", user.id);
  revalidatePath("/manager"); revalidatePath("/today");
}

export async function reorderActions(payload: { task_id: string; ids: string[] }) {
  const { supabase, user } = await context();
  const { data: task } = await supabase.from("tasks").select("id").eq("id", payload.task_id).eq("user_id", user.id).maybeSingle();
  if (!task || payload.ids.length > 500) return;
  await Promise.all(payload.ids.map((id, sort_order) => supabase.from("actions").update({ sort_order }).eq("id", id).eq("task_id", task.id).eq("user_id", user.id)));
}

export async function saveLink(formData: FormData) {
  const { supabase, user } = await context();
  const projectId = String(formData.get("project_id") || ""); const taskId = String(formData.get("task_id") || "");
  const documentId = String(formData.get("document_id") || ""); const materialId = String(formData.get("material_id") || "");
  if ((!!projectId === !!taskId) || (!!documentId === !!materialId)) return;
  const parentTable = projectId ? "projects" : "tasks", parentId = projectId || taskId;
  const targetTable = documentId ? "documents" : "materials", targetId = documentId || materialId;
  const [{ data: parent }, { data: target }] = await Promise.all([
    supabase.from(parentTable).select("id").eq("id", parentId).eq("user_id", user.id).maybeSingle(),
    supabase.from(targetTable).select("id").eq("id", targetId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!parent || !target) return;
  const { error } = await supabase.from("work_links").insert({ user_id: user.id, project_id: projectId || null, task_id: taskId || null, document_id: documentId || null, material_id: materialId || null });
  if (error && error.code !== "23505") console.error("work link insert failed", error.message);
  revalidatePath("/manager");
}

export async function deleteLink(formData: FormData) {
  const { supabase, user } = await context();
  await supabase.from("work_links").delete().eq("id",String(formData.get("id"))).eq("user_id",user.id);
  revalidatePath("/manager");
}
