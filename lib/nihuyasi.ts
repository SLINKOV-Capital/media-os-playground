import type { NihuyasiEntry } from "@/lib/types";

export type NihuyasiCreateResult =
  | { ok: true; entry: NihuyasiEntry }
  | { ok: false; error: NihuyasiErrorCode };

export type NihuyasiMutationResult =
  | { ok: true }
  | { ok: false; error: NihuyasiErrorCode };

export type NihuyasiErrorCode = "auth" | "empty" | "save_failed";

export const NIHUYASI_ERROR_MESSAGES: Record<NihuyasiErrorCode, string> = {
  auth: "Сессия истекла. Войдите снова.",
  empty: "Текст не может быть пустым",
  save_failed: "Не удалось сохранить запись",
};

/** Postgres `date` and timestamptz fields are normalized for client rendering. */
export function normalizeNihuyasiEntry(row: Record<string, unknown>): NihuyasiEntry {
  const rawDate = row.date;
  let date = "";

  if (typeof rawDate === "string") {
    date = rawDate.slice(0, 10);
  } else if (rawDate != null) {
    date = String(rawDate).slice(0, 10);
  }

  return {
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    date,
    text: String(row.text ?? ""),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
  };
}
