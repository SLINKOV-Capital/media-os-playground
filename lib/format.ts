export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTodayHeading(date: Date = new Date()): string {
  return date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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


