import { DeleteWorkflowTemplateButton } from "@/components/DeleteWorkflowTemplateButton";
import { AppShell } from "@/components/AppShell";
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
    redirect("/login");
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
          <Link href="/templates/new" className="ghost-button">
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
          <div className="database-wrap">
            <table className="database-table">
              <thead>
                <tr>
                  <th>Тип документа</th>
                  <th>Действий</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id}>
                    <td>
                      <span className="database-strong">
                        {template.document_type}
                      </span>
                    </td>
                    <td className="database-muted">
                      {template.action_titles.length}
                    </td>
                    <td className="database-actions">
                      <Link
                        href={`/templates/${template.id}/edit`}
                        className="text-link"
                      >
                        Редактировать
                      </Link>
                      <DeleteWorkflowTemplateButton id={template.id} />
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
