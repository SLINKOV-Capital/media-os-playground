"use server";

import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import type { NihuyasiEntry } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function revalidateNihuyasi() {
  revalidatePath("/today");
  revalidatePath("/nihuyasi");
}

export async function createNihuyasiEntry(
  text: string,
  date: string
): Promise<NihuyasiEntry | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const trimmed = text.trim();

  if (!trimmed || !date) {
    return null;
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
    return null;
  }

  revalidateNihuyasi();
  return data as NihuyasiEntry;
}

export async function updateNihuyasiText(
  id: string,
  text: string
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const trimmed = text.trim();

  if (!id || !trimmed) {
    return false;
  }

  const { error } = await supabase
    .from("nihuyasi")
    .update({ text: trimmed })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update nihuyasi text:", error.message);
    return false;
  }

  revalidateNihuyasi();
  return true;
}

export async function updateNihuyasiDate(
  id: string,
  date: string
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  if (!id || !date) {
    return false;
  }

  const { error } = await supabase
    .from("nihuyasi")
    .update({ date })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to update nihuyasi date:", error.message);
    return false;
  }

  revalidateNihuyasi();
  return true;
}

export async function deleteNihuyasiEntry(id: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  if (!id) {
    return false;
  }

  const { error } = await supabase
    .from("nihuyasi")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete nihuyasi entry:", error.message);
    return false;
  }

  revalidateNihuyasi();
  return true;
}
