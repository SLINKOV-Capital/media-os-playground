import { AppShell } from "@/components/AppShell";
import { BatchMaterialImageUpload } from "@/components/BatchMaterialImageUpload";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import type { Document } from "@/lib/types";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function BatchMaterialsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(COCKPIT_LOGIN_PATH);

  const { data, error } = await supabase
    .from("documents")
    .select("id, title")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) console.error("Failed to fetch documents:", error.message);

  const documents = (data ?? []) as Pick<Document, "id" | "title">[];

  return (
    <AppShell>
      <div className="content-page content-page-narrow material-page">
        <Link href="/materials" className="breadcrumb-link">
          ← Материалы
        </Link>

        <div className="doc-page-stack">
          <header className="page-header">
            <h1 className="page-title-static">Пакетная загрузка изображений</h1>
          </header>

          {documents.length === 0 ? (
            <div className="empty-state">
              <p>Сначала создайте документ, чтобы добавить материалы.</p>
            </div>
          ) : (
            <BatchMaterialImageUpload documents={documents} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
