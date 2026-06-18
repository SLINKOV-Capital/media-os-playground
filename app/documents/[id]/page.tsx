import { generateActions, updateDocumentTitle } from "@/app/documents/actions";
import { DocumentActionsBlock } from "@/components/DocumentActionsBlock";
import { DocumentMaterialsBlock } from "@/components/DocumentMaterialsBlock";
import { PageTitle } from "@/components/PageTitle";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { mapActionsMaterials } from "@/lib/mapActionMaterials";
import { mapDocumentMaterialsFromRows } from "@/lib/mapDocumentMaterials";
import type { Document, WorkflowTemplateV2 } from "@/lib/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type DocumentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ active?: string }>;
};

export default async function DocumentPage({
  params,
  searchParams,
}: DocumentPageProps) {
  const { id } = await params;
  const { active } = await searchParams;
  const activeOnly = active === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: documentData, error: documentError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentError) {
    console.error("Failed to fetch document:", documentError.message);
    notFound();
  }

  if (!documentData) {
    notFound();
  }

  const document = documentData as Document;

  const [{ data: actionsData }, { data: documentMaterialsData }] =
    await Promise.all([
      supabase
        .from("actions")
        .select("*, action_materials(material_id, materials(id, title))")
        .eq("document_id", id)
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("document_materials")
        .select("material_id, materials(*)")
        .eq("document_id", id)
        .eq("user_id", user.id),
    ]);

  const actions = mapActionsMaterials(actionsData ?? []);
  const materials = mapDocumentMaterialsFromRows(documentMaterialsData ?? []);

  let template: WorkflowTemplateV2 | null = null;

  if (actions.length === 0) {
    const { data: templateData } = await supabase
      .from("workflow_templates_v2")
      .select("*")
      .eq("document_type", document.document_type)
      .eq("user_id", user.id)
      .maybeSingle();

    template = (templateData as WorkflowTemplateV2 | null) ?? null;
  }

  async function saveDocumentTitle(title: string) {
    "use server";

    const formData = new FormData();
    formData.set("id", document.id);
    formData.set("title", title);
    return updateDocumentTitle(formData);
  }

  return (
    <AppShell>
      <div className="content-page doc-page">
        <Link href="/documents" className="breadcrumb-link">
          ← Документы
        </Link>

        <div className="doc-page-stack">
          <header className="page-header">
            <PageTitle value={document.title} onSave={saveDocumentTitle} />
            <p className="doc-page-type">{document.document_type}</p>
          </header>

          {actions.length === 0 && template && (
            <div className="workflow-callout">
              <p className="workflow-callout-title">
                Найден шаблон для этого типа документа
              </p>
              <ul className="workflow-callout-list">
                {template.action_titles.map((title) => (
                  <li key={title}>{title}</li>
                ))}
              </ul>
              <form action={generateActions}>
                <input type="hidden" name="document_id" value={document.id} />
                <button type="submit" className="ghost-button">
                  Сгенерировать действия
                </button>
              </form>
            </div>
          )}

          <DocumentActionsBlock
            documentId={document.id}
            actions={actions}
            materials={materials}
            activeOnly={activeOnly}
          />

          <DocumentMaterialsBlock
            documentId={document.id}
            materials={materials}
          />
        </div>
      </div>
    </AppShell>
  );
}
