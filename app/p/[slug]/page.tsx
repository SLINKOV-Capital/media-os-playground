import { DEMO_ARTICLE } from "@/lib/demoArticle";
import { fetchPublishedDocumentBySlug } from "@/lib/publicSite";
import {
  DEFAULT_PUBLIC_LOCALE,
  publicDocumentPath,
  publicDocumentPathForType,
} from "@/lib/site";
import { notFound, permanentRedirect } from "next/navigation";

type LegacyPublicDocumentPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyPublicDocumentPage({
  params,
}: LegacyPublicDocumentPageProps) {
  const { slug } = await params;

  if (slug === DEMO_ARTICLE.slug) {
    permanentRedirect(publicDocumentPath(slug, "articles"));
  }

  const document = await fetchPublishedDocumentBySlug(
    slug,
    DEFAULT_PUBLIC_LOCALE
  );
  if (!document?.site_slug) notFound();

  permanentRedirect(
    publicDocumentPathForType(
      document.site_slug,
      document.document_type,
      document.site_locale
    )
  );
}
