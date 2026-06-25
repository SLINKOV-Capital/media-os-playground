import { AppShell } from "@/components/AppShell";
import { NihuyasiPageContent } from "@/components/NihuyasiPageContent";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import type { NihuyasiEntry } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function NihuyasiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const { data, error } = await supabase
    .from("nihuyasi")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch nihuyasi entries:", error.message);
  }

  const entries = (data ?? []) as NihuyasiEntry[];

  return (
    <AppShell>
      <div className="content-page nihuyasi-page">
        <header className="content-header">
          <div>
            <h1 className="content-title">Нихуяси</h1>
            <p className="content-subtitle">
              Личная лента наблюдений по датам
            </p>
          </div>
        </header>

        <NihuyasiPageContent initialEntries={entries} />
      </div>
    </AppShell>
  );
}
