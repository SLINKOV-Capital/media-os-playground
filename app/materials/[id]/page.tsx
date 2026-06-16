import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Action, Document, Material } from "@/lib/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type MaterialPageProps = {
  params: Promise<{ id: string }>;
};

type MaterialWithDocument = Material & {
  documents: Pick<Document, "id" | "title">;
};

type LinkedAction = Pick<
  Action,
  "id" | "title" | "done" | "document_id" | "sort_order"
>;

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export default async function MaterialPage({ params }: MaterialPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: materialData, error: materialError } = await supabase
    .from("materials")
    .select("*, documents(id, title)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (materialError) {
    console.error("Failed to fetch material:", materialError.message);
    notFound();
  }

  if (!materialData) {
    notFound();
  }

  const material = materialData as MaterialWithDocument;
  const document = material.documents;

  const { data: linkedActionsData, error: actionsError } = await supabase
    .from("actions")
    .select("id, title, done, document_id, sort_order")
    .eq("material_id", id)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (actionsError) {
    console.error("Failed to fetch linked actions:", actionsError.message);
  }

  const linkedActions = (linkedActionsData ?? []) as LinkedAction[];

  return (
    <AppShell>
      <div className="content-page material-page">
        {document && (
          <Link
            href={`/documents/${document.id}`}
            className="breadcrumb-link"
          >
            ← {document.title}
          </Link>
        )}

        <header className="material-page-header">
          <h1 className="material-page-title">{material.title}</h1>
          <p className="material-page-type">{material.material_type}</p>
        </header>

        <div className="material-page-properties">
          {material.file_url_or_path && (
            <div className="material-property">
              <span className="material-property-label">URL / путь</span>
              <span className="material-property-value">
                {isExternalUrl(material.file_url_or_path) ? (
                  <a
                    href={material.file_url_or_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link"
                  >
                    {material.file_url_or_path}
                  </a>
                ) : (
                  <a
                    href={material.file_url_or_path}
                    className="text-link"
                  >
                    {material.file_url_or_path}
                  </a>
                )}
              </span>
            </div>
          )}

          {material.notes && (
            <div className="material-property">
              <span className="material-property-label">Заметки</span>
              <span className="material-property-value material-property-notes">
                {material.notes}
              </span>
            </div>
          )}

          {document && (
            <div className="material-property">
              <span className="material-property-label">Документ</span>
              <span className="material-property-value">
                <Link
                  href={`/documents/${document.id}`}
                  className="text-link"
                >
                  {document.title}
                </Link>
              </span>
            </div>
          )}
        </div>

        <section className="doc-section">
          <div className="section-header">
            <h2 className="section-label">Связанные действия</h2>
          </div>

          {linkedActions.length === 0 ? (
            <p className="section-empty">
              Нет действий, привязанных к этому материалу
            </p>
          ) : (
            <ul className="material-actions-list">
              {linkedActions.map((action) => (
                <li
                  key={action.id}
                  className={`material-action-item${
                    action.done ? " is-done" : ""
                  }`}
                >
                  <Link
                    href={`/documents/${action.document_id}`}
                    className="material-action-link"
                  >
                    {action.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
