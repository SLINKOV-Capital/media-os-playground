import { ArticlesIndex } from "@/components/ArticlesIndex";
import { publicSectionMetadata } from "@/components/PublicSectionPage";
import { getPublicSection } from "@/lib/publicContent";
import { fetchPublishedDocumentsBySection } from "@/lib/publicSite";
import { publicDocumentPath } from "@/lib/site";
import { notFound } from "next/navigation";

const SECTION_ID = "stories";

export const metadata = publicSectionMetadata(getPublicSection(SECTION_ID)!);

export default async function StoriesPage() {
  const section = getPublicSection(SECTION_ID);
  if (!section) notFound();
  const documents = await fetchPublishedDocumentsBySection("stories");
  const items = documents.map((document) => ({
    slug: document.site_slug!,
    title: document.title,
    type: document.document_type,
    preview: document.preview ?? "",
    href: publicDocumentPath(document.site_slug!, "stories", document.site_locale),
    image: document.publication_cover?.image_url,
  }));

  return <ArticlesIndex section={section} items={items} />;
}
