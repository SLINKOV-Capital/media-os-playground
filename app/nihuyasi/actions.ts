"use server";

import {
  normalizeNihuyasiEntry,
  type NihuyasiCreateResult,
  type NihuyasiMutationResult,
} from "@/lib/nihuyasi";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateNihuyasi() {
  revalidatePath("/today");
  revalidatePath("/nihuyasi");
}

export async function createNihuyasiEntry(
  text: string,
  date: string
): Promise<NihuyasiCreateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "auth" };
  }

  const trimmed = text.trim();

  if (!trimmed || !date) {
    return { ok: false, error: "empty" };
  }

  const { data, error } = await supabase
    .from("nihuyasi")
    .insert({
      user_id: user.id,
      date,
      text: trimmed,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Failed to create nihuyasi entry:", error?.message);
    return { ok: false, error: "save_failed" };
  }

  revalidateNihuyasi();
  return { ok: true, entry: normalizeNihuyasiEntry(data) };
}

export async function updateNihuyasiText(
  id: string,
  text: string
): Promise<NihuyasiMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "auth" };
  }

  const trimmed = text.trim();

  if (!id || !trimmed) {
    return { ok: false, error: "empty" };
  }

  const { error } = await supabase
    .from("nihuyasi")
    .update({ text: trimmed })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update nihuyasi text:", error.message);
    return { ok: false, error: "save_failed" };
  }

  revalidateNihuyasi();
  return { ok: true };
}

export async function updateNihuyasiDate(
  id: string,
  date: string
): Promise<NihuyasiMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "auth" };
  }

  if (!id || !date) {
    return { ok: false, error: "empty" };
  }

  const { error } = await supabase
    .from("nihuyasi")
    .update({ date })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update nihuyasi date:", error.message);
    return { ok: false, error: "save_failed" };
  }

  revalidateNihuyasi();
  return { ok: true };
}

export async function deleteNihuyasiEntry(
  id: string
): Promise<NihuyasiMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "auth" };
  }

  if (!id) {
    return { ok: false, error: "empty" };
  }

  const { error } = await supabase
    .from("nihuyasi")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete nihuyasi entry:", error.message);
    return { ok: false, error: "save_failed" };
  }

  revalidateNihuyasi();
  return { ok: true };
}
