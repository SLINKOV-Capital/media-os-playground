import {
  updateMaterialTitle,
} from "@/app/documents/actions";
import { AppShell } from "@/components/AppShell";
import { PageTitle } from "@/components/PageTitle";
import { MaterialDocumentsSection } from "@/components/MaterialDocumentsSection";
import { MaterialPropertiesEditor } from "@/components/MaterialPropertiesEditor";
import { COCKPIT_LOGIN_PATH } from "@/lib/authPaths";
import { createClient } from "@/lib/supabase/server";
import { mapDocumentLinksFromRows } from "@/lib/mapDocumentMaterials";
import { getMaterialTypeIcon } from "@/lib/materialTypes";
import type { Document, Material } from "@/lib/types";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type MaterialPageProps = {
  params: Promise<{ id: string }>;
};

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
    { data: documentLinksData, error: documentLinksError },
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
        </div>
      </div>
    </AppShell>
  );
}
