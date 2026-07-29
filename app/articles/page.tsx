import { ArticlesIndex } from "@/components/ArticlesIndex";
import { publicSectionMetadata } from "@/components/PublicSectionPage";
import { getPublicSection } from "@/lib/publicContent";
import { notFound } from "next/navigation";

const SECTION_ID = "articles";

export const metadata = publicSectionMetadata(getPublicSection(SECTION_ID)!);

export default function ArticlesPage() {
  const section = getPublicSection(SECTION_ID);
  if (!section) notFound();
  return <ArticlesIndex section={section} />;
}
