import { ArticlesIndex } from "@/components/ArticlesIndex";
import { publicSectionMetadata } from "@/components/PublicSectionPage";
import { getPublicSection } from "@/lib/publicContent";
import { fetchPublishedDocumentsBySection } from "@/lib/publicSite";
import { notFound } from "next/navigation";

const SECTION_ID = "articles";

export const metadata = publicSectionMetadata(getPublicSection(SECTION_ID)!);

export default async function ArticlesPage() {
  const section = getPublicSection(SECTION_ID);
  if (!section) notFound();
  const documents = await fetchPublishedDocumentsBySection("articles");
  const items = documents.map((document) => ({
    slug: document.site_slug!,
    title: document.title,
    type: document.document_type,
    preview: document.preview ?? "",
    image: document.publication_cover?.image_url,
  }));

  return <ArticlesIndex section={section} items={items} />;
}
