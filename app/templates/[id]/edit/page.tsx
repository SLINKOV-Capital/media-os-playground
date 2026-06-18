import { AppShell } from "@/components/AppShell";
import { TemplateEditorShell } from "@/components/TemplateEditorShell";
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

  const { data, error } = await supabase
    .from("workflow_templates_v2")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch workflow template:", error.message);
    notFound();
  }

  if (!data) {
    notFound();
  }

  const template = data as WorkflowTemplateV2;

  return (
    <AppShell>
      <div className="content-page content-page-narrow template-page">
        <Link href="/templates" className="breadcrumb-link">
          ← Шаблоны
        </Link>

        <TemplateEditorShell template={template} />
      </div>
    </AppShell>
  );
}
