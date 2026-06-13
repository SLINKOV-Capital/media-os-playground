"use server";

import { createClient } from "@/lib/supabase/server";
import { TASK_STATUSES, type TaskStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";

function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

export async function createTask(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const trimmedTitle = String(formData.get("title") ?? "").trim();
  const status = String(formData.get("status") ?? "");

  if (!trimmedTitle) {
    return;
  }

  if (!isTaskStatus(status)) {
    return;
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title: trimmedTitle,
    status,
  });

  if (error) {
    console.error("Failed to create task:", error.message);
    return;
  }

  revalidatePath("/today");
}

export async function updateTaskStatus(taskId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не авторизован" };
  }

  if (!isTaskStatus(status)) {
    return { error: "Некорректный статус" };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  return { error: null };
}
