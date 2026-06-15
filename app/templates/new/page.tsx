import { WorkflowTemplateForm } from "@/components/WorkflowTemplateForm";
import { AppShell } from "@/components/AppShell";
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
        <WorkflowTemplateForm />
      </div>
    </AppShell>
  );
}
