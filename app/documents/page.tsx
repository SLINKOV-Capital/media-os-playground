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
          <Link href="/documents/new" className="ghost-button">
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
          <div className="database-wrap">
            <table className="database-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Тип</th>
                  <th>Обновлён</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <Link
                        href={`/documents/${document.id}`}
                        className="database-link"
                      >
                        {document.title}
                      </Link>
                    </td>
                    <td className="database-muted">{document.document_type}</td>
                    <td className="database-muted">
                      {formatDate(document.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
