import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { Document } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
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
              Главные объекты работы в Media OS
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
          <div className="collection-list">
            <div
              className="collection-header collection-header-documents"
              aria-hidden="true"
            >
              <span>Название</span>
              <span>Тип</span>
              <span>Обновлён</span>
            </div>
            {documents.map((document) => (
              <Link
                key={document.id}
                href={`/documents/${document.id}`}
                className="collection-row collection-row-documents"
              >
                <span className="collection-primary">{document.title}</span>
                <span className="collection-meta">{document.document_type}</span>
                <span className="collection-meta">
                  {formatDate(document.updated_at)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
