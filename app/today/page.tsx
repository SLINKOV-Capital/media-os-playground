import { AppShell } from "@/components/AppShell";
import { SortableTodayList } from "@/components/SortableTodayList";
import type { FocusAction } from "@/components/TodayItem";
import { createClient } from "@/lib/supabase/server";
import { formatTodayHeading } from "@/lib/format";
import { redirect } from "next/navigation";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("actions")
    .select("*, documents(id, title), materials(id, title)")
    .eq("today", true)
    .eq("user_id", user.id)
    .order("today_sort_order", { ascending: true });

  if (error) {
    console.error("Failed to fetch focus actions:", error.message);
  }

  const focusActions = (data ?? []) as FocusAction[];
  const today = new Date();
  const todayHeading = formatTodayHeading(today);
  const todayIso = today.toISOString().slice(0, 10);

  return (
    <AppShell>
      <div className="content-page today-page">
        <header className="content-header content-header-stack">
          <h1 className="content-title">Сегодня</h1>
          <time className="page-dateline" dateTime={todayIso}>
            {todayHeading}
          </time>
        </header>

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
      </div>
    </AppShell>
  );
}
