import { createMaterial } from "@/app/documents/actions";
import { AppShell } from "@/components/AppShell";
import { MaterialTypeSelect } from "@/components/MaterialTypeSelect";
import { PageTitle } from "@/components/PageTitle";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewMaterialPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
              <input type="hidden" name="redirect" value="materials" />

              <div className="notion-property">
                <label htmlFor="document_id" className="notion-property-label">
                  Документ
                </label>
                <div className="notion-property-value">
                  <select
                    id="document_id"
                    name="document_id"
                    required
                    defaultValue=""
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
                  Название
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

              <div className="notion-property">
                <label htmlFor="material_type" className="notion-property-label">
                  Тип
                </label>
                <div className="notion-property-value">
                  <MaterialTypeSelect
                    id="material_type"
                    name="material_type"
                    required
                  />
                </div>
              </div>

              <div className="notion-property notion-property-optional">
                <label
                  htmlFor="file_url_or_path"
                  className="notion-property-label"
                >
                  URL / путь
                  <span className="notion-property-optional-tag">
                    необязательно
                  </span>
                </label>
                <div className="notion-property-value">
                  <input
                    id="file_url_or_path"
                    name="file_url_or_path"
                    type="text"
                    placeholder="https://…"
                  />
                </div>
              </div>

              <div className="notion-property notion-property-optional notion-property-textarea">
                <label htmlFor="notes" className="notion-property-label">
                  Заметки
                  <span className="notion-property-optional-tag">
                    необязательно
                  </span>
                </label>
                <div className="notion-property-value">
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    placeholder="Комментарий"
                  />
                </div>
              </div>

              <div className="page-form-footer">
                <button type="submit" className="primary-button">
                  Создать материал
                </button>
                <Link href="/materials" className="text-link">
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
