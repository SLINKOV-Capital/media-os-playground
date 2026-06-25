import { createDocument } from "@/app/documents/actions";
import { AppShell } from "@/components/AppShell";
import { listTemplateDocumentTypes } from "@/lib/document-types";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewDocumentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const { data: templatesData, error } = await supabase
    .from("workflow_templates_v2")
    .select("document_type")
    .eq("user_id", user.id)
    .order("document_type", { ascending: true });

  if (error) {
    console.error("Failed to fetch workflow templates:", error.message);
  }

  const documentTypes = listTemplateDocumentTypes(templatesData ?? []);

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

        {documentTypes.length === 0 ? (
          <div className="empty-state">
            <p>Сначала создайте шаблон — он задаёт тип документа.</p>
            <Link href="/templates/new" className="text-link">
              Создать шаблон
            </Link>
          </div>
        ) : (
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
              <p className="form-field-hint">
                Только типы из существующих шаблонов
              </p>
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
        )}
      </div>
    </AppShell>
  );
}
