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
      <div className="content-page content-page-narrow">
        <Link href="/templates" className="breadcrumb-link">
          ← Шаблоны
        </Link>
        <header className="content-header content-header-stack">
          <h1 className="content-title">Новый шаблон</h1>
          <p className="content-subtitle">
            Один шаблон на тип документа
          </p>
        </header>
        <WorkflowTemplateForm documentTypes={documentTypes} />
      </div>
    </AppShell>
  );
}
