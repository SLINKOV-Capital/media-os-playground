import {
  PublicSectionPage,
  publicSectionMetadata,
} from "@/components/PublicSectionPage";
import { getPublicSection } from "@/lib/publicContent";
import { notFound } from "next/navigation";

const SECTION_ID = "books";

export const metadata = publicSectionMetadata(getPublicSection(SECTION_ID)!);

export default function BooksPage() {
  const section = getPublicSection(SECTION_ID);
  if (!section) notFound();
  return <PublicSectionPage section={section} />;
}
