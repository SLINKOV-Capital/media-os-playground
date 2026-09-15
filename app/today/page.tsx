import { AppShell } from "@/components/AppShell";
import { SortableTodayList } from "@/components/SortableTodayList";
import { TodayNihuyasiSection } from "@/components/TodayNihuyasiSection";
import { TodayDailyMatrix } from "@/components/TodayDailyMatrix";
import type { FocusAction } from "@/components/TodayItem";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import { createNewsServiceClient } from "@/lib/supabase/newsServer";
import { formatMoscowIsoDate, formatTodayHeading } from "@/lib/format";
import { mapActionMaterials } from "@/lib/mapActionMaterials";
import { normalizeNihuyasiEntry } from "@/lib/nihuyasi";
import {
  addNewsKeyDays,
  newsQueueWindow,
  type NewsQueuePick,
  type NewsQueuePublication,
} from "@/lib/newsQueueIndicator";
import type { DailyWritingStatus, Document } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const todayIso = formatMoscowIsoDate();
  const todayHeading = formatTodayHeading();
  const now = new Date();
  const newsWindow = newsQueueWindow(now);
  const matrixStartDate = addNewsKeyDays(todayIso, -7);
  const matrixEndDate = addNewsKeyDays(todayIso, 6);
  const newsSupabase = createNewsServiceClient();
  const newsPicksQuery = newsSupabase
    ? newsSupabase
        .from("news_ai_picks")
        .select("id, title_ru, scheduled_at, auto_publish, publish_targets")
        .in("status", ["queue", "published"])
        .gte("scheduled_at", newsWindow.start)
        .lt("scheduled_at", newsWindow.end)
        .order("scheduled_at", { ascending: true })
    : Promise.resolve({ data: [], error: null });

  const [
    { data: actionsData, error: actionsError },
    { data: nihuyasiData, error: nihuyasiError },
    { data: writingData, error: writingError },
    { data: newsPicksData, error: newsPicksError },
  ] =
    await Promise.all([
      supabase
        .from("actions")
        .select(
          "*, documents(id, title), action_materials(material_id, materials(id, title))"
        )
        .eq("today", true)
        .eq("user_id", user.id)
        .order("today_sort_order", { ascending: true }),
      supabase
        .from("nihuyasi")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", matrixStartDate)
        .lte("date", matrixEndDate)
        .order("created_at", { ascending: true }),
      supabase
        .from("daily_writing_status")
        .select("user_id, date, minutes")
        .eq("user_id", user.id)
        .gte("date", matrixStartDate)
        .lte("date", matrixEndDate),
      newsPicksQuery,
    ]);

  const newsPicks = (newsPicksData ?? []) as NewsQueuePick[];
  const { data: newsPublicationsData, error: newsPublicationsError } =
    newsPicks.length > 0 && newsSupabase
      ? await newsSupabase
        .from("news_publications")
        .select("ai_pick_id, platform, status, created_at")
        .in("ai_pick_id", newsPicks.map((pick) => pick.id))
        .order("created_at", { ascending: false })
      : { data: [], error: null };

  if (actionsError) {
    console.error("Failed to fetch focus actions:", actionsError.message);
  }

  if (nihuyasiError) {
    console.error("Failed to fetch nihuyasi entries:", nihuyasiError.message);
  }

  if (writingError) {
    console.error("Failed to fetch writing statuses:", writingError.message);
  }

  if (newsPicksError) {
    console.error("Failed to fetch News Service queue:", newsPicksError.message);
  }

  if (newsPublicationsError) {
    console.error("Failed to fetch News Service publications:", newsPublicationsError.message);
  }

  const focusActions: FocusAction[] = (actionsData ?? []).map((row) => {
    const rowData = row as Parameters<typeof mapActionMaterials>[0] & {
      documents: Pick<Document, "id" | "title">;
    };
    const { documents } = rowData;

    return {
      ...mapActionMaterials(rowData),
      documents,
    };
  });

  const nihuyasiEntries = (nihuyasiData ?? []).map((row) =>
    normalizeNihuyasiEntry(row as Record<string, unknown>)
  );
  const writingStatuses = (writingData ?? []) as DailyWritingStatus[];
  const newsPublications = (newsPublicationsData ?? []) as NewsQueuePublication[];
  const publicationsByPick = new Map<string, NewsQueuePublication[]>();
  for (const publication of newsPublications) {
    publicationsByPick.set(publication.ai_pick_id, [
      ...(publicationsByPick.get(publication.ai_pick_id) ?? []),
      publication,
    ]);
  }

  return (
    <AppShell>
      <div className="content-page today-page">
        <header className="content-header content-header-stack">
          <h1 className="content-title">Сегодня</h1>
          <time className="page-dateline" dateTime={todayIso}>
            {todayHeading}
          </time>
        </header>

        <TodayDailyMatrix
          nowIso={now.toISOString()}
          newsItems={newsPicks.map((aiPick) => ({
            aiPick,
            publications: publicationsByPick.get(aiPick.id) ?? [],
          }))}
          writingStatuses={writingStatuses}
          nihuyasiEntries={nihuyasiEntries}
        />

        {focusActions.length === 0 ? (
          <div className="empty-state">
            <p>
              Ничего в фокусе. Откройте документ и нажмите «В фокус» у нужного
              действия.
            </p>
          </div>
        ) : (
          <SortableTodayList actions={focusActions} />
        )}

        <TodayNihuyasiSection
          initialEntries={nihuyasiEntries.filter((entry) => entry.date === todayIso)}
          todayDate={todayIso}
        />
      </div>
    </AppShell>
  );
}
