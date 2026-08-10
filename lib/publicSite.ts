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
import type { DemoTerm } from "@/lib/demoArticle";
import type { RecommendedArticleCard } from "@/components/RecommendedArticles";

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

export async function fetchPublishedDocumentTerms(
  documentId: string
): Promise<DemoTerm[]> {
  const supabase = await createClient();
  const { data: terms, error } = await supabase
    .from("document_terms")
    .select("id, term, definition, explained_in_document_id")
    .eq("document_id", documentId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch published document terms:", error.message);
    return [];
  }

  const explainedIds = [...new Set((terms ?? []).map((term) => term.explained_in_document_id).filter((id): id is string => Boolean(id)))];
  let explainedDocuments: { id: string; title: string; site_slug: string | null }[] = [];
  if (explainedIds.length > 0) {
    const { data } = await supabase.from("documents").select("id, title, site_slug")
      .in("id", explainedIds).eq("site_status", "published");
    explainedDocuments = data ?? [];
  }
  const explainedById = new Map(explainedDocuments.map((document) => [document.id, document]));

  return (terms ?? []).map((term) => {
    const explained = term.explained_in_document_id
      ? explainedById.get(term.explained_in_document_id)
      : null;
    return {
      id: term.id,
      lemma: term.term,
      gloss: term.definition,
      explainedIn: explained?.site_slug
        ? { title: explained.title, href: `/p/${explained.site_slug}` }
        : undefined,
    };
  });
}

export async function fetchPublishedDocumentRecommendations(
  documentId: string
): Promise<RecommendedArticleCard[]> {
  const supabase = await createClient();
  const { data: links, error } = await supabase
    .from("document_recommendations")
    .select("recommended_document_id")
    .eq("document_id", documentId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !links?.length) {
    if (error) console.error("Failed to fetch document recommendations:", error.message);
    return [];
  }

  const orderedIds = links.map((link) => link.recommended_document_id);
  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select("id, title, preview, site_slug")
    .in("id", orderedIds)
    .eq("site_status", "published");
  if (documentsError) {
    console.error("Failed to fetch recommended documents:", documentsError.message);
    return [];
  }

  const published = new Map((documents ?? []).map((document) => [document.id, document]));
  const { data: covers } = await supabase.from("document_publication_images")
    .select("document_id, image_url").in("document_id", orderedIds)
    .eq("role", "cover").eq("status", "ready");
  const coverById = new Map((covers ?? []).map((cover) => [cover.document_id, cover.image_url]));

  return orderedIds.flatMap((id) => {
    const document = published.get(id);
    if (!document?.site_slug) return [];
    return [{
      href: `/p/${document.site_slug}`,
      title: document.title,
      preview: document.preview ?? "",
      image: coverById.get(id) ?? null,
    }];
  });
}
