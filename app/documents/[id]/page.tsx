import { generateActions, updateDocumentTitle } from "@/app/documents/actions";
import { DocumentActionsBlock } from "@/components/DocumentActionsBlock";
import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";
import { DocumentMaterialsBlock } from "@/components/DocumentMaterialsBlock";
import { DocumentPublicationImagesBlock } from "@/components/DocumentPublicationImagesBlock";
import { DocumentSiteBlock } from "@/components/DocumentSiteBlock";
import { DocumentTypeSelect } from "@/components/DocumentTypeSelect";
import { PageTitle } from "@/components/PageTitle";
import { AppShell } from "@/components/AppShell";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { listTemplateDocumentTypes } from "@/lib/document-types";
import { isDocumentSiteLocked } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { mapActionsMaterials } from "@/lib/mapActionMaterials";
import {
  collectMaterialIdsFromLinkRows,
  mapDocumentMaterialsFromRows,
} from "@/lib/mapDocumentMaterials";
import type { Document, DocumentPublicationImage, Material, WorkflowTemplateV2 } from "@/lib/types";
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
    redirect(COCKPIT_LOGIN_PATH);
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

  const [
    { data: actionsData },
    { data: documentMaterialsData },
    { data: publicationImagesData },
    { data: templatesData },
  ] = await Promise.all([
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
      supabase
        .from("document_publication_images")
        .select("*, source_material:materials(id, title)")
        .eq("document_id", id)
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("workflow_templates_v2")
        .select("document_type")
        .eq("user_id", user.id)
        .order("document_type", { ascending: true }),
    ]);

  const actions = mapActionsMaterials(actionsData ?? []);
  let materials = mapDocumentMaterialsFromRows(documentMaterialsData ?? []);

  // Fallback when materials(*) embed returns null but junction rows exist.
  if (materials.length === 0) {
    const materialIds = collectMaterialIdsFromLinkRows(
      documentMaterialsData ?? []
    );

    if (materialIds.length > 0) {
      const { data: materialsData, error: materialsError } = await supabase
        .from("materials")
        .select("*")
        .eq("user_id", user.id)
        .in("id", materialIds);

      if (materialsError) {
        console.error(
          "Failed to fetch document materials by id:",
          materialsError.message
        );
      } else {
        const byId = new Map(
          ((materialsData ?? []) as Material[]).map((material) => [
            material.id,
            material,
          ])
        );
        materials = materialIds
          .map((materialId) => byId.get(materialId))
          .filter((material): material is Material => Boolean(material));
      }
    }
  }

  const templateTypes = listTemplateDocumentTypes(templatesData ?? []);

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
            <DocumentTypeSelect
              documentId={document.id}
              value={document.document_type}
              templateTypes={templateTypes}
              disabled={isDocumentSiteLocked(document)}
            />
          </header>

          <DocumentSiteBlock document={document} />

          <DocumentPublicationImagesBlock
            documentId={document.id}
            assets={(publicationImagesData ?? []) as DocumentPublicationImage[]}
            materials={materials}
          />

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

          <DeleteDocumentButton
            documentId={document.id}
            published={Boolean(document.site_published_at) || document.site_status === "published"}
          />
        </div>
      </div>
    </AppShell>
  );
}
