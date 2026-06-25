import { AppShell } from "@/components/AppShell";
import { TemplateEditorShell } from "@/components/TemplateEditorShell";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NewTemplatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  return (
    <AppShell>
      <div className="content-page content-page-narrow template-page">
        <Link href="/templates" className="breadcrumb-link">
          ← Шаблоны
        </Link>

        <TemplateEditorShell />
      </div>
    </AppShell>
  );
}
