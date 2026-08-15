import { ArticlesIndex } from "@/components/ArticlesIndex";
import { BooksShowcase } from "@/components/BooksShowcase";
import { publicSectionMetadata } from "@/components/PublicSectionPage";
import { getPublicSection } from "@/lib/publicContent";
import { notFound } from "next/navigation";

const SECTION_ID = "books";

export const metadata = publicSectionMetadata(getPublicSection(SECTION_ID)!);

export default async function BooksPage() {
  const section = getPublicSection(SECTION_ID);
  if (!section) notFound();

  return (
    <ArticlesIndex
      section={section}
      items={[]}
      featured={<BooksShowcase />}
      emptyMessage={null}
    />
  );
}
