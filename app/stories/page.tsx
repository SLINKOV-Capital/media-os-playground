import {
  PublicSectionPage,
  publicSectionMetadata,
} from "@/components/PublicSectionPage";
import { getPublicSection } from "@/lib/publicContent";
import { fetchPublishedDocumentsBySection } from "@/lib/publicSite";
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
    href: `/p/${document.site_slug}`,
  }));

  return <PublicSectionPage section={section} items={items} />;
}
