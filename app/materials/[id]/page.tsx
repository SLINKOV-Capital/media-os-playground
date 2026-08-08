import { updateMaterialTitle } from "@/app/documents/actions";
import { AppShell } from "@/components/AppShell";
import { PageTitle } from "@/components/PageTitle";
import { MaterialDocumentsSection } from "@/components/MaterialDocumentsSection";
import { MaterialPropertiesEditor } from "@/components/MaterialPropertiesEditor";
import { DeleteMaterialButton } from "@/components/DeleteMaterialButton";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import {
  collectDocumentIdsFromLinkRows,
  mapDocumentLinksFromRows,
} from "@/lib/mapDocumentMaterials";
import { getMaterialTypeIcon } from "@/lib/materialTypes";
import type { Document, Material } from "@/lib/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type MaterialPageProps = {
  params: Promise<{ id: string }>;
};

async function loadLinkedDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  materialId: string,
  userId: string
): Promise<Pick<Document, "id" | "title">[]> {
  const { data: linkRows, error: linksError } = await supabase
    .from("document_materials")
    .select("document_id, documents(id, title)")
    .eq("material_id", materialId)
    .eq("user_id", userId);

  if (linksError) {
    console.error("Failed to fetch linked documents:", linksError.message);
  }

  const fromEmbed = mapDocumentLinksFromRows(linkRows ?? []);

  if (fromEmbed.length > 0) {
    return fromEmbed;
  }

  // Fallback: embed can return null documents even when junction rows exist.
  const documentIds = collectDocumentIdsFromLinkRows(linkRows ?? []);

  if (documentIds.length === 0) {
    return [];
  }

  const { data: documentsData, error: documentsError } = await supabase
    .from("documents")
    .select("id, title")
    .eq("user_id", userId)
    .in("id", documentIds)
    .order("title", { ascending: true });

  if (documentsError) {
    console.error(
      "Failed to fetch documents for material links:",
      documentsError.message
    );
    return [];
  }

  return (documentsData ?? []) as Pick<Document, "id" | "title">[];
}

export default async function MaterialPage({ params }: MaterialPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(COCKPIT_LOGIN_PATH);
  }

  const [
    { data: materialData, error: materialError },
    { data: allDocumentsData, error: allDocumentsError },
  ] = await Promise.all([
    supabase
      .from("materials")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
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

  if (allDocumentsError) {
    console.error("Failed to fetch documents:", allDocumentsError.message);
  }

  const material = materialData as Material;
  const linkedDocuments = await loadLinkedDocuments(
    supabase,
    material.id,
    user.id
  );

  const linkedDocumentIds = new Set(linkedDocuments.map((document) => document.id));
  const allDocuments = (allDocumentsData ?? []) as Pick<Document, "id" | "title">[];
  const availableDocuments = allDocuments.filter(
    (document) => !linkedDocumentIds.has(document.id)
  );

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

        <div className="doc-page-stack">
          <header className="page-header">
            <PageTitle
              value={material.title}
              onSave={saveMaterialTitle}
              ariaLabel="Название материала"
              placeholder="Название материала"
              leading={
                <span
                  className="material-type-icon material-type-icon-large page-title-leading"
                  aria-hidden="true"
                >
                  {getMaterialTypeIcon(material.material_type)}
                </span>
              }
            />
          </header>

          <MaterialPropertiesEditor
            key={`${material.material_type}|${material.file_url_or_path ?? ""}|${material.preview_url ?? ""}|${material.notes ?? ""}`}
            material={material}
          />

          <MaterialDocumentsSection
            materialId={material.id}
            linkedDocuments={linkedDocuments}
            availableDocuments={availableDocuments}
          />

          <DeleteMaterialButton materialId={material.id} />
        </div>
      </div>
    </AppShell>
  );
}
