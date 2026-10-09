import { ArticlesIndex } from "@/components/ArticlesIndex";
import { BooksShowcase } from "@/components/BooksShowcase";
import { publicSectionMetadata } from "@/components/PublicSectionPage";
import { getPublicSection } from "@/lib/publicContent";
import { fetchPublishedDocumentsBySection } from "@/lib/publicSite";
import { createClient } from "@/lib/supabase/server";
import type { BookPreviewFragment } from "@/components/BooksShowcase";
import { notFound } from "next/navigation";

const SECTION_ID = "books";

export const metadata = publicSectionMetadata(getPublicSection(SECTION_ID)!);

export default async function BooksPage() {
  const section = getPublicSection(SECTION_ID);
  if (!section) notFound();

  const [stories, supabase] = await Promise.all([
    fetchPublishedDocumentsBySection("stories"),
    createClient(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  const fragments: BookPreviewFragment[] = stories
    .filter((story) => story.book_relationship === "excerpt" && story.book_preview_text?.trim())
    .sort((a, b) => (a.book_preview_order ?? Number.MAX_SAFE_INTEGER) - (b.book_preview_order ?? Number.MAX_SAFE_INTEGER))
    .map((story) => ({
      id: story.id,
      title: story.title,
      text: story.book_preview_text!.trim(),
      cardText: story.book_card_text ?? null,
    }));

  return (
    <ArticlesIndex
      section={section}
      items={[]}
      featured={<BooksShowcase fragments={fragments} isAuthor={Boolean(user)} />}
      emptyMessage={null}
    />
  );
}
