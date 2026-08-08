import { createMaterial } from "@/app/documents/actions";
import { AppShell } from "@/components/AppShell";
import { MaterialCreateProperties } from "@/components/MaterialCreateProperties";
import { PageTitle } from "@/components/PageTitle";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

type NewMaterialPageProps = {
  searchParams: Promise<{ document_id?: string; action_id?: string }>;
};

export default async function NewMaterialPage({ searchParams }: NewMaterialPageProps) {
  const { document_id: requestedDocumentId, action_id: actionId } =
    await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, title")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch documents:", error.message);
  }

  const documents = (data ?? []) as Pick<Document, "id" | "title">[];

  return (
    <AppShell>
      <div className="content-page content-page-narrow material-page">
        <Link href="/materials" className="breadcrumb-link">
          ← Материалы
        </Link>

        <div className="doc-page-stack">
          <header className="page-header">
            <PageTitle value="Новый материал" />
          </header>

          {documents.length === 0 ? (
            <div className="empty-state">
              <p>Сначала создайте документ, чтобы добавить материал.</p>
              <Link href="/documents/new" className="text-link">
                Создать документ
              </Link>
            </div>
          ) : (
            <form action={createMaterial} className="notion-form notion-form-page">
              <input
                type="hidden"
                name="redirect"
                value={requestedDocumentId ? "document" : "materials"}
              />
              {actionId && <input type="hidden" name="action_id" value={actionId} />}

              <div className="notion-property">
                <label htmlFor="document_id" className="notion-property-label">
                  Документ
                </label>
                <div className="notion-property-value">
                  <select
                    id="document_id"
                    name="document_id"
                    required
                    defaultValue={requestedDocumentId ?? ""}
                  >
                    <option value="" disabled>
                      Выберите документ
                    </option>
                    {documents.map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="notion-property">
                <label htmlFor="title" className="notion-property-label">
                  <span className="notion-property-label-primary">
                    Название материала
                  </span>
                </label>
                <div className="notion-property-value">
                  <input
                    id="title"
                    name="title"
                    type="text"
                    required
                    placeholder="Текст, файл, ссылка…"
                  />
                </div>
              </div>

              <MaterialCreateProperties idSuffix="new" />

              <div className="material-content-block">
                <label htmlFor="notes" className="material-content-label">
                  <span className="notion-property-label-primary">Содержимое</span>
                  <span className="notion-property-optional-tag">
                    необязательно
                  </span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  className="material-content-field"
                  rows={6}
                  placeholder="Markdown: текст, списки, ссылки…"
                />
              </div>

              <div className="page-form-footer">
                <button type="submit" className="primary-button">
                  Создать материал
                </button>
                <Link
                  href={requestedDocumentId ? `/documents/${requestedDocumentId}` : "/materials"}
                  className="text-link"
                >
                  Отмена
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
