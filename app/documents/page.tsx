import { AppShell } from "@/components/AppShell";
import { SortableDocumentsList } from "@/components/SortableDocumentsList";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch documents:", error.message);
  }

  const documents = (data ?? []) as Document[];

  return (
    <AppShell>
      <div className="content-page">
        <header className="content-header">
          <div>
            <h1 className="content-title">Документы</h1>
            <p className="content-subtitle">
              Рабочие и опубликованные документы
            </p>
          </div>
          <Link href="/documents/new" className="notion-new-button">
            + Новый документ
          </Link>
        </header>

        {documents.length === 0 ? (
          <div className="empty-state">
            <p>Пока нет документов</p>
            <Link href="/documents/new" className="text-link">
              Создать первый документ
            </Link>
          </div>
        ) : (
          <SortableDocumentsList documents={documents} />
        )}
      </div>
    </AppShell>
  );
}
