export type NewsQueueVisualState = "queue" | "scheduled" | "published" | "error";

export type NewsQueuePick = {
  id: string;
  title_ru: string | null;
  scheduled_at: string | null;
  auto_publish: boolean | null;
  publish_targets: Record<string, boolean> | null;
};

export type NewsQueuePublication = {
  ai_pick_id: string;
  platform: string;
  status: string;
  created_at: string;
};

export type NewsQueueIndicatorItem = {
  aiPick: NewsQueuePick;
  publications: NewsQueuePublication[];
};

export const NEWS_QUEUE_STATE_LABELS: Record<NewsQueueVisualState, string> = {
  queue: "В Queue",
  scheduled: "Запланировано",
  published: "Опубликовано",
  error: "Ошибка",
};

const ACTIVE_PLATFORMS = ["threads", "linkedin", "telegram", "instagram", "rss"];

export const NEWS_PLATFORM_LABELS: Record<string, string> = {
  threads: "Threads",
  linkedin: "LinkedIn",
  telegram: "Telegram",
  instagram: "Instagram",
  rss: "RSS",
};

const STATE_PRIORITY: Record<NewsQueueVisualState, number> = {
  published: 1,
  queue: 2,
  scheduled: 3,
  error: 4,
};

export function newsDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function addNewsKeyDays(key: string, amount: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + amount, 12))
    .toISOString()
    .slice(0, 10);
}

export function newsWeekMonday(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  return addNewsKeyDays(key, -(weekday === 0 ? 6 : weekday - 1));
}

export function newsQueueWindow(now: Date): { start: string; end: string } {
  const today = newsDateKey(now);
  return {
    start: new Date(`${addNewsKeyDays(today, -7)}T00:00:00+03:00`).toISOString(),
    end: new Date(`${addNewsKeyDays(today, 7)}T00:00:00+03:00`).toISOString(),
  };
}

function enabledPlatforms(pick: NewsQueuePick): string[] {
  const targets = pick.publish_targets ?? {};
  return ACTIVE_PLATFORMS.filter((platform) => {
    if (platform === "rss" && typeof targets.rss !== "boolean") {
      return true;
    }
    return typeof targets[platform] === "boolean" ? targets[platform] : true;
  });
}

function latestPublications(publications: NewsQueuePublication[]) {
  const latest = new Map<string, NewsQueuePublication>();
  for (const publication of publications) {
    const previous = latest.get(publication.platform);
    if (previous?.status === "success") continue;
    if (
      publication.status === "success" ||
      !previous ||
      new Date(publication.created_at).getTime() > new Date(previous.created_at).getTime()
    ) {
      latest.set(publication.platform, publication);
    }
  }
  return latest;
}

export function newsQueueVisualState(
  pick: NewsQueuePick,
  publications: NewsQueuePublication[],
  now: Date
): NewsQueueVisualState {
  const enabled = enabledPlatforms(pick);
  const latest = latestPublications(publications);
  if (
    enabled.length > 0 &&
    enabled.every((platform) => latest.get(platform)?.status === "success")
  ) {
    return "published";
  }

  const scheduledTime = pick.scheduled_at
    ? new Date(pick.scheduled_at).getTime()
    : Number.NaN;
  const isDue = Number.isFinite(scheduledTime) && scheduledTime <= now.getTime();
  const publicationStarted = enabled.some((platform) => latest.has(platform));

  if (isDue && (Boolean(pick.auto_publish) || publicationStarted)) return "error";
  if (pick.auto_publish && Number.isFinite(scheduledTime)) return "scheduled";
  return "queue";
}

export function aggregateNewsQueueState(
  states: NewsQueueVisualState[]
): NewsQueueVisualState | null {
  if (states.length === 0) return null;
  return states.reduce((highest, state) =>
    STATE_PRIORITY[state] > STATE_PRIORITY[highest] ? state : highest
  );
}

export function newsChannelStatusSummary(
  pick: NewsQueuePick,
  publications: NewsQueuePublication[]
): string {
  const latest = latestPublications(publications);
  return enabledPlatforms(pick)
    .map((platform) => {
      const status = latest.get(platform)?.status;
      const marker = status === "success"
        ? "✓"
        : status === "pending" || status === "publishing"
          ? "…"
          : "✕";
      return `${NEWS_PLATFORM_LABELS[platform] ?? platform} ${marker}`;
    })
    .join(" · ");
}
