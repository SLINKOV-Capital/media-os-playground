import {
  updateMaterialTitle,
} from "@/app/documents/actions";
import { AppShell } from "@/components/AppShell";
import { InlineEditableTitle } from "@/components/InlineEditableTitle";
import { MaterialDocumentsSection } from "@/components/MaterialDocumentsSection";
import { MaterialPropertiesEditor } from "@/components/MaterialPropertiesEditor";
import { createClient } from "@/lib/supabase/server";
import { mapDocumentLinksFromRows } from "@/lib/mapDocumentMaterials";
import { getMaterialTypeIcon } from "@/lib/materialTypes";
import type { Action, Document, Material } from "@/lib/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type MaterialPageProps = {
  params: Promise<{ id: string }>;
};

type LinkedAction = Pick<
  Action,
  "id" | "title" | "done" | "document_id" | "sort_order"
> & {
  documentTitle: string;
};

export default async function MaterialPage({ params }: MaterialPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: materialData, error: materialError },
    { data: documentLinksData, error: documentLinksError },
    { data: linkedActionsData, error: actionsError },
    { data: allDocumentsData, error: allDocumentsError },
  ] = await Promise.all([
    supabase
      .from("materials")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("document_materials")
      .select("document_id, documents(id, title)")
      .eq("material_id", id)
      .eq("user_id", user.id),
    supabase
      .from("action_materials")
      .select(
        "actions(id, title, done, document_id, sort_order, documents(title))"
      )
      .eq("material_id", id)
      .eq("user_id", user.id),
    supabase
      .from("documents")
      .select("id, title")
      .eq("user_id", user.id)
      .order("title", { ascending: true }),
  ]);

  if (materialError) {
    console.error("Failed to fetch material:", materialError.message);
    notFound();
  }

  if (!materialData) {
    notFound();
  }

  if (documentLinksError) {
    console.error("Failed to fetch linked documents:", documentLinksError.message);
  }

  if (actionsError) {
    console.error("Failed to fetch linked actions:", actionsError.message);
  }

  if (allDocumentsError) {
    console.error("Failed to fetch documents:", allDocumentsError.message);
  }

  const material = materialData as Material;
  const linkedDocuments = mapDocumentLinksFromRows(documentLinksData ?? []);
  const linkedDocumentIds = new Set(linkedDocuments.map((document) => document.id));
  const allDocuments = (allDocumentsData ?? []) as Pick<Document, "id" | "title">[];
  const availableDocuments = allDocuments.filter(
    (document) => !linkedDocumentIds.has(document.id)
  );

  const linkedActions = (linkedActionsData ?? [])
    .map((row) => {
      const actions = row.actions as
        | (LinkedAction & {
            documents: { title: string } | { title: string }[] | null;
          })
        | (LinkedAction & {
            documents: { title: string } | { title: string }[] | null;
          })[]
        | null;

      const action = Array.isArray(actions) ? actions[0] : actions;

      if (!action) {
        return null;
      }

      const documents = action.documents;
      const document = Array.isArray(documents) ? documents[0] : documents;

      return {
        id: action.id,
        title: action.title,
        done: action.done,
        document_id: action.document_id,
        sort_order: action.sort_order,
        documentTitle: document?.title ?? "Без названия",
      } satisfies LinkedAction;
    })
    .filter((action): action is LinkedAction => Boolean(action))
    .sort((a, b) => a.sort_order - b.sort_order);

  async function saveMaterialTitle(title: string) {
    "use server";

    const formData = new FormData();
    formData.set("id", material.id);
    formData.set("title", title);
    return updateMaterialTitle(formData);
  }

  return (
    <AppShell>
      <div className="content-page material-page">
        <Link href="/materials" className="breadcrumb-link">
          ← Материалы
        </Link>

        <header className="material-page-header">
          <div className="material-page-title-row">
            <span
              className="material-type-icon material-type-icon-large"
              aria-hidden="true"
            >
              {getMaterialTypeIcon(material.material_type)}
            </span>
            <InlineEditableTitle
              value={material.title}
              onSave={saveMaterialTitle}
              inputClassName="material-page-title"
            />
          </div>
        </header>

        <MaterialPropertiesEditor
          key={`${material.material_type}|${material.file_url_or_path ?? ""}|${material.notes ?? ""}`}
          material={material}
        />

        <MaterialDocumentsSection
          materialId={material.id}
          linkedDocuments={linkedDocuments}
          availableDocuments={availableDocuments}
        />

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
                    <span className="material-action-title">{action.title}</span>
                    <span className="material-action-document">
                      Документ: {action.documentTitle}
                    </span>
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
