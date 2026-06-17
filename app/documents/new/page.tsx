import { createDocument } from "@/app/documents/actions";
import { AppShell } from "@/components/AppShell";
import { mergeDocumentTypes } from "@/lib/document-types";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewDocumentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: documentsData }, { data: templatesData }] = await Promise.all([
    supabase.from("documents").select("document_type").eq("user_id", user.id),
    supabase
      .from("workflow_templates_v2")
      .select("document_type")
      .eq("user_id", user.id),
  ]);

  const documentTypes = mergeDocumentTypes(
    (documentsData ?? []).map((row) => row.document_type),
    (templatesData ?? []).map((row) => row.document_type)
  );

  return (
    <AppShell>
      <div className="content-page content-page-narrow">
        <Link href="/documents" className="breadcrumb-link">
          ← Документы
        </Link>
        <header className="content-header content-header-stack">
          <h1 className="content-title">Новый документ</h1>
          <p className="content-subtitle">
            Создайте документ и продолжите работу на его странице
          </p>
        </header>

        <form action={createDocument} className="notion-form notion-form-page">
          <div className="form-field">
            <label htmlFor="title" className="form-field-label">
              Название
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Без названия"
              className="form-field-control form-field-control-title"
            />
          </div>

          <div className="form-field">
            <label htmlFor="document_type" className="form-field-label">
              Тип документа
            </label>
            <p className="form-field-hint">Выберите тип из списка</p>
            <select
              id="document_type"
              name="document_type"
              required
              defaultValue=""
              className="form-field-control"
            >
              <option value="" disabled>
                Выберите тип
              </option>
              {documentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              Создать
            </button>
            <Link href="/documents" className="text-link">
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
