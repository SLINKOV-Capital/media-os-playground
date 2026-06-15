import { createDocument } from "@/app/documents/actions";
import { AppShell } from "@/components/AppShell";
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

        <form action={createDocument} className="notion-form">
          <div className="field">
            <label htmlFor="title">Название</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Без названия"
              className="notion-input notion-input-title"
            />
          </div>
          <div className="field">
            <label htmlFor="document_type">Тип документа</label>
            <input
              id="document_type"
              name="document_type"
              type="text"
              required
              placeholder="article"
              className="notion-input"
            />
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
