import { AppShell } from "@/components/AppShell";
import { restoreArchivedCard } from "@/app/manager/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ManagerArchivePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/slinkov-cockpit-login");
  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("id,name,description,archived_at").eq("user_id", user.id).not("archived_at", "is", null).order("archived_at", { ascending: false }),
    supabase.from("tasks").select("id,title,description,archived_at").eq("user_id", user.id).not("archived_at", "is", null).order("archived_at", { ascending: false }),
  ]);
  return <AppShell><div className="content-page manager-page"><header className="content-header"><div><h1 className="content-title">Архив диспетчера</h1><p className="content-subtitle">Восстановление не меняет связи, категорию или выполнение.</p></div><Link className="button-link" href="/manager">К Kanban</Link></header><div className="manager-archive-list">
    {[...(projects ?? []).map((item) => ({ id: item.id, kind: "project" as const, title: item.name, description: item.description, archived_at: item.archived_at })), ...(tasks ?? []).map((item) => ({ id: item.id, kind: "task" as const, title: item.title, description: item.description, archived_at: item.archived_at }))].map((item) => <article className="manager-archive-row" key={`${item.kind}:${item.id}`}><div><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}<time>{item.kind === "project" ? "Проект" : "Задача"} · {new Date(item.archived_at!).toLocaleString("ru-RU")}</time></div><form action={restoreArchivedCard}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="kind" value={item.kind}/><button type="submit">Восстановить</button></form></article>)}
    {!projects?.length && !tasks?.length && <p className="empty-state">Архив проектов и задач пуст.</p>}
  </div><p className="manager-archive-material-link"><Link href="/materials?archived=true">Архив материалов</Link></p></div></AppShell>;
}
