"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type WritingMinutes = 0 | 35 | 70 | 90;

type SaveWritingResult =
  | { ok: true }
  | { ok: false; error: "auth" | "invalid" | "save_failed" };

const WRITING_MINUTES = new Set<WritingMinutes>([0, 35, 70, 90]);

export async function saveWritingStatus(
  date: string,
  minutes: WritingMinutes
): Promise<SaveWritingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "auth" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !WRITING_MINUTES.has(minutes)) {
    return { ok: false, error: "invalid" };
  }

  const { error } = await supabase.from("daily_writing_status").upsert(
    { user_id: user.id, date, minutes },
    { onConflict: "user_id,date" }
  );

  if (error) {
    console.error("Failed to save writing status:", error.message);
    return { ok: false, error: "save_failed" };
  }

  revalidatePath("/today");
  return { ok: true };
}
