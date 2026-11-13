import { AppShell } from "@/components/AppShell";
import { TodayNihuyasiSection } from "@/components/TodayNihuyasiSection";
import { TodayDailyMatrix } from "@/components/TodayDailyMatrix";
import { toggleAction, toggleTask } from "@/app/manager/actions";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import { createNewsServiceClient } from "@/lib/supabase/newsServer";
import { formatMoscowIsoDate, formatTodayHeading } from "@/lib/format";
import { normalizeNihuyasiEntry } from "@/lib/nihuyasi";
import {
  addNewsKeyDays,
  newsQueueWindow,
  type NewsQueuePick,
  type NewsQueuePublication,
} from "@/lib/newsQueueIndicator";
import type { DailyWritingStatus } from "@/lib/types";
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
    { data: tasksData, error: tasksError },
    { data: workActionsData, error: workActionsError },
    { data: nihuyasiData, error: nihuyasiError },
    { data: writingData, error: writingError },
    { data: newsPicksData, error: newsPicksError },
  ] =
    await Promise.all([
      supabase.from("tasks").select("id,title,due_date,event_at,completed,project_id").eq("user_id",user.id).is("archived_at",null).eq("completed",false).or(`due_date.lte.${todayIso},event_at.lte.${todayIso}T20:59:59+00:00`).order("due_date"),
      supabase.from("actions").select("id,title,task_id,due_date,done,tasks!inner(id,title,due_date,completed,archived_at)").eq("user_id",user.id).eq("done",false).eq("tasks.completed",false).is("tasks.archived_at",null).not("due_date","is",null).lte("due_date",todayIso).order("due_date"),
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

  if (tasksError) console.error("Failed to fetch due tasks:",tasksError.message);
  if (workActionsError) console.error("Failed to fetch due task actions:",workActionsError.message);

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

        <section className="today-work-items"><h2>Задачи и действия по сроку</h2>{(tasksData?.length??0)+(workActionsData?.length??0)===0?<p>Нет просроченных задач и действий или сроков на сегодня.</p>:<ul>{(tasksData??[]).map(t=><li key={`t${t.id}`}><form action={toggleTask}><input type="hidden" name="id" value={t.id}/><button>□</button></form><a href="/manager">{t.title}</a><time>{t.event_at?new Date(t.event_at).toLocaleString("ru-RU",{dateStyle:"short",timeStyle:"short"}):t.due_date}</time></li>)}{(workActionsData??[]).map(a=><li key={`a${a.id}`}><form action={toggleAction}><input type="hidden" name="id" value={a.id}/><button>□</button></form><a href="/manager">↳ {a.title}</a><time>{a.due_date}</time></li>)}</ul>}<a href="/manager">Открыть диспетчер →</a></section>

        <TodayNihuyasiSection
          initialEntries={nihuyasiEntries.filter((entry) => entry.date === todayIso)}
          todayDate={todayIso}
        />
      </div>
    </AppShell>
  );
}
