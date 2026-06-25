import { createClient } from "@/lib/supabase/server";
import { LATEST_PUBLISHED_LIMIT } from "@/lib/site";
import type { Material, PublicDocument } from "@/lib/types";
import { mapDocumentMaterialsFromRows } from "@/lib/mapDocumentMaterials";

export async function fetchFeaturedPublishedDocuments(): Promise<PublicDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, title, document_type, preview, content_md, site_slug, site_published_at, site_featured"
    )
    .eq("site_status", "published")
    .eq("site_featured", true)
    .order("site_published_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch featured documents:", error.message);
    return [];
  }

  return (data ?? []) as PublicDocument[];
}

export async function fetchLatestPublishedDocuments(): Promise<PublicDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, title, document_type, preview, content_md, site_slug, site_published_at, site_featured"
    )
    .eq("site_status", "published")
    .order("site_published_at", { ascending: false })
    .limit(LATEST_PUBLISHED_LIMIT);

  if (error) {
    console.error("Failed to fetch latest documents:", error.message);
    return [];
  }

  return (data ?? []) as PublicDocument[];
}

export async function fetchPublishedDocumentBySlug(
  slug: string
): Promise<PublicDocument | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, title, document_type, preview, content_md, site_slug, site_published_at, site_featured"
    )
    .eq("site_status", "published")
    .eq("site_slug", slug)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch published document:", error.message);
    return null;
  }

  return (data as PublicDocument | null) ?? null;
}

export async function fetchPublishedDocumentMaterials(
  documentId: string
): Promise<Material[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_materials")
    .select("material_id, materials(*)")
    .eq("document_id", documentId);

  if (error) {
    console.error("Failed to fetch published document materials:", error.message);
    return [];
  }

  return mapDocumentMaterialsFromRows(data ?? []);
}
