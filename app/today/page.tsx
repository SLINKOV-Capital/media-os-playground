import { AppShell } from "@/components/AppShell";
import { SortableTodayList } from "@/components/SortableTodayList";
import { TodayNihuyasiSection } from "@/components/TodayNihuyasiSection";
import type { FocusAction } from "@/components/TodayItem";
import { createClient } from "@/lib/supabase/server";
import { formatLocalIsoDate, formatTodayHeading } from "@/lib/format";
import { mapActionMaterials } from "@/lib/mapActionMaterials";
import type { Document, NihuyasiEntry } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const today = new Date();
  const todayIso = formatLocalIsoDate(today);
  const todayHeading = formatTodayHeading(today);

  const [{ data: actionsData, error: actionsError }, { data: nihuyasiData, error: nihuyasiError }] =
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
        .eq("date", todayIso)
        .order("created_at", { ascending: true }),
    ]);

  if (actionsError) {
    console.error("Failed to fetch focus actions:", actionsError.message);
  }

  if (nihuyasiError) {
    console.error("Failed to fetch nihuyasi entries:", nihuyasiError.message);
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

  const nihuyasiEntries = (nihuyasiData ?? []) as NihuyasiEntry[];

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

        <TodayNihuyasiSection
          initialEntries={nihuyasiEntries}
          todayDate={todayIso}
        />
      </div>
    </AppShell>
  );
}
