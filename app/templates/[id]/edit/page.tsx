import { WorkflowTemplateForm } from "@/components/WorkflowTemplateForm";
import { AppShell } from "@/components/AppShell";
import { mergeDocumentTypes } from "@/lib/document-types";
import { createClient } from "@/lib/supabase/server";
import type { WorkflowTemplateV2 } from "@/lib/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type EditTemplatePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data, error }, { data: documentsData }, { data: templatesData }] =
    await Promise.all([
      supabase.from("workflow_templates_v2").select("*").eq("id", id).maybeSingle(),
      supabase.from("documents").select("document_type").eq("user_id", user.id),
      supabase
        .from("workflow_templates_v2")
        .select("document_type")
        .eq("user_id", user.id),
    ]);

  if (error) {
    console.error("Failed to fetch workflow template:", error.message);
    notFound();
  }

  if (!data) {
    notFound();
  }

  const template = data as WorkflowTemplateV2;
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
          <h1 className="content-title">Редактировать шаблон</h1>
          <p className="content-subtitle">{template.document_type}</p>
        </header>
        <WorkflowTemplateForm
          template={template}
          documentTypes={documentTypes}
        />
      </div>
    </AppShell>
  );
}
