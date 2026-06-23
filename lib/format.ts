/** Calendar timezone for the Today screen (system contract). */
export const TODAY_TIMEZONE = "Europe/Moscow";

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Russian long date for the Today page dateline (always Europe/Moscow). */
export function formatTodayHeading(date: Date = new Date()): string {
  return date.toLocaleDateString("ru-RU", {
    timeZone: TODAY_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** ISO date (YYYY-MM-DD) in Europe/Moscow — Today page and Today-scoped queries. */
export function formatMoscowIsoDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TODAY_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** ISO date (YYYY-MM-DD) in the runtime local timezone (non-Today screens). */
export function formatLocalIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatNihuyasiDateHeader(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function groupNihuyasiByDate<T extends { date: string; created_at: string }>(
  entries: T[]
): [string, T[]][] {
  const groups = new Map<string, T[]>();

  for (const entry of entries) {
    const existing = groups.get(entry.date) ?? [];
    existing.push(entry);
    groups.set(entry.date, existing);
  }

  for (const [date, groupEntries] of groups) {
    groupEntries.sort((a, b) => b.created_at.localeCompare(a.created_at));
    groups.set(date, groupEntries);
  }

  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}

export function sortNihuyasiEntries<T extends { date: string; created_at: string }>(
  entries: T[]
): T[] {
  return [...entries].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }

    return b.created_at.localeCompare(a.created_at);
  });
}


