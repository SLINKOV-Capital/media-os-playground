import { DeleteWorkflowTemplateButton } from "@/components/DeleteWorkflowTemplateButton";
import { AppShell } from "@/components/AppShell";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowTemplateV2 } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const { data, error } = await supabase
    .from("workflow_templates_v2")
    .select("*")
    .order("document_type", { ascending: true });

  if (error) {
    console.error("Failed to fetch workflow templates:", error.message);
  }

  const templates = (data ?? []) as WorkflowTemplateV2[];

  return (
    <AppShell>
      <div className="content-page">
        <header className="content-header">
          <div>
            <h1 className="content-title">Шаблоны</h1>
            <p className="content-subtitle">
              Workflow для типов документов
            </p>
          </div>
          <Link href="/templates/new" className="notion-new-button">
            + Новый шаблон
          </Link>
        </header>

        {templates.length === 0 ? (
          <div className="empty-state">
            <p>Пока нет шаблонов</p>
            <Link href="/templates/new" className="text-link">
              Создать первый шаблон
            </Link>
          </div>
        ) : (
          <div className="collection-list">
            <div
              className="collection-header collection-header-templates"
              aria-hidden="true"
            >
              <span>Тип документа</span>
              <span>Действий</span>
            </div>
            {templates.map((template) => (
              <div
                key={template.id}
                className="collection-row collection-row-templates"
              >
                <Link
                  href={`/templates/${template.id}/edit`}
                  className="collection-row-link collection-row-link-templates"
                >
                  <span className="collection-primary">
                    {template.document_type}
                  </span>
                  <span className="collection-meta">
                    {template.action_titles.length}
                  </span>
                </Link>
                <div className="collection-row-actions">
                  <DeleteWorkflowTemplateButton id={template.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
