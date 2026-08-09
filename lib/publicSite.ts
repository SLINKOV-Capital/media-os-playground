import { createClient } from "@/lib/supabase/server";
import {
  LATEST_PUBLISHED_LIMIT,
  publicDocumentSection,
  type PublicDocumentSection,
} from "@/lib/site";
import type {
  DocumentPublicationImage,
  Material,
  PublicDocument,
} from "@/lib/types";
import { mapDocumentMaterialsFromRows } from "@/lib/mapDocumentMaterials";

async function attachPublicationCovers(
  documents: PublicDocument[]
): Promise<PublicDocument[]> {
  if (documents.length === 0) return documents;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_publication_images")
    .select("document_id, image_url, alt")
    .in(
      "document_id",
      documents.map((document) => document.id)
    )
    .eq("role", "cover")
    .eq("status", "ready");

  if (error) {
    console.error("Failed to fetch publication covers:", error.message);
    return documents;
  }

  const covers = new Map(
    (data ?? []).map((cover) => [
      cover.document_id,
      { image_url: cover.image_url, alt: cover.alt },
    ])
  );

  return documents.map((document) => ({
    ...document,
    publication_cover: covers.get(document.id) ?? null,
  }));
}

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

  return attachPublicationCovers((data ?? []) as PublicDocument[]);
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

  return attachPublicationCovers((data ?? []) as PublicDocument[]);
}

export async function fetchPublishedDocumentsBySection(
  section: Exclude<PublicDocumentSection, null>
): Promise<PublicDocument[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("documents")
    .select(
      "id, title, document_type, preview, content_md, site_slug, site_published_at, site_featured"
    )
    .eq("site_status", "published")
    .order("site_published_at", { ascending: false });

  if (error) {
    console.error(`Failed to fetch published ${section}:`, error.message);
    return [];
  }

  const documents = ((data ?? []) as PublicDocument[]).filter(
    (document) => publicDocumentSection(document.document_type) === section
  );

  return attachPublicationCovers(documents);
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

export async function fetchPublishedDocumentCover(
  documentId: string
): Promise<Pick<DocumentPublicationImage, "image_url" | "alt"> | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_publication_images")
    .select("image_url, alt")
    .eq("document_id", documentId)
    .eq("role", "cover")
    .eq("status", "ready")
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch published document cover:", error.message);
    return null;
  }

  return data ?? null;
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
