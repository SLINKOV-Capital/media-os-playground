import { WorkflowTemplateForm } from "@/components/WorkflowTemplateForm";
import { AppShell } from "@/components/AppShell";
import { mergeDocumentTypes } from "@/lib/document-types";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewTemplatePage() {
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
      <div className="content-page content-page-narrow template-page">
        <Link href="/templates" className="breadcrumb-link">
          ← Шаблоны
        </Link>

        <div className="doc-page-stack">
          <header className="doc-page-header">
            <h1 className="doc-page-title">Новый шаблон</h1>
            <p className="doc-page-type">тип страницы документа</p>
          </header>

          <WorkflowTemplateForm documentTypes={documentTypes} />
        </div>
      </div>
    </AppShell>
  );
}
