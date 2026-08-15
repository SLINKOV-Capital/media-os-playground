import { ArticleExperience } from "@/components/ArticleExperience";
import {
  RecommendedArticles,
  type RecommendedArticleCard,
} from "@/components/RecommendedArticles";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import {
  DEMO_ARTICLE,
  DEMO_RELATED_ARTICLES,
  DEMO_TERMS,
  type DemoTerm,
} from "@/lib/demoArticle";
import {
  fetchPublishedDocumentBySlug,
  fetchPublishedDocumentCover,
  fetchPublishedDocumentRecommendations,
  fetchPublishedDocumentTerms,
} from "@/lib/publicSite";
import {
  DEFAULT_PUBLIC_LOCALE,
  PUBLIC_SITE_ORIGIN,
  publicDocumentPath,
  publicDocumentSection,
  publicHomePath,
  publicSectionPath,
  type PublicDocumentSection,
} from "@/lib/site";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type PublicDocumentPageProps = {
  params: Promise<{ section: string; slug: string }>;
};

type ArticleView = {
  title: string;
  preview: string | null;
  content_md: string;
  cover: { src: string; alt: string } | null;
  related: readonly RecommendedArticleCard[];
  backHref: string;
  backLabel: string;
  richDemo: boolean;
  terms: DemoTerm[];
};

function sectionLabel(section: Exclude<PublicDocumentSection, null>): string {
  if (section === "articles") return "Статьи";
  if (section === "stories") return "Рассказы";
  if (section === "books") return "Книги";
  if (section === "plays") return "Пьесы";
  if (section === "video") return "Подкаст";
  if (section === "presentations") return "Презентации";
  return "На главную";
}

export async function generateMetadata({
  params,
}: PublicDocumentPageProps): Promise<Metadata> {
  const { section, slug } = await params;

  if (slug === DEMO_ARTICLE.slug && section === "articles") {
    const path = publicDocumentPath(slug, "articles");
    return {
      title: DEMO_ARTICLE.title,
      description: DEMO_ARTICLE.preview,
      alternates: { canonical: path },
    };
  }

  const document = await fetchPublishedDocumentBySlug(
    slug,
    DEFAULT_PUBLIC_LOCALE
  );
  const documentSection = document
    ? publicDocumentSection(document.document_type)
    : null;

  if (!document || !documentSection || documentSection !== section) {
    return { title: "Не найдено", robots: { index: false, follow: false } };
  }

  const path = publicDocumentPath(slug, documentSection);
  return {
    title: document.title,
    description: document.preview ?? undefined,
    alternates: { canonical: new URL(path, PUBLIC_SITE_ORIGIN).toString() },
  };
}

async function resolveArticle(
  section: string,
  slug: string
): Promise<ArticleView | null> {
  if (slug === DEMO_ARTICLE.slug && section === "articles") {
    return {
      title: DEMO_ARTICLE.title,
      preview: DEMO_ARTICLE.preview,
      content_md: DEMO_ARTICLE.content_md,
      cover: DEMO_ARTICLE.cover
        ? { src: DEMO_ARTICLE.cover, alt: DEMO_ARTICLE.title }
        : null,
      related: DEMO_RELATED_ARTICLES,
      backHref: publicSectionPath("articles"),
      backLabel: "Статьи",
      richDemo: true,
      terms: DEMO_TERMS,
    };
  }

  const document = await fetchPublishedDocumentBySlug(
    slug,
    DEFAULT_PUBLIC_LOCALE
  );
  if (!document) return null;

  const documentSection = publicDocumentSection(document.document_type);
  if (!documentSection || documentSection !== section) return null;

  const [publicationCover, related, terms] = await Promise.all([
    fetchPublishedDocumentCover(document.id),
    fetchPublishedDocumentRecommendations(document.id),
    fetchPublishedDocumentTerms(document.id),
  ]);

  return {
    title: document.title,
    preview: document.preview,
    content_md: document.content_md ?? "",
    cover: publicationCover
      ? { src: publicationCover.image_url, alt: publicationCover.alt }
      : null,
    related,
    terms,
    backHref: publicSectionPath(documentSection),
    backLabel: sectionLabel(documentSection),
    richDemo: false,
  };
}

export default async function PublicDocumentPage({
  params,
}: PublicDocumentPageProps) {
  const { section, slug } = await params;
  const article = await resolveArticle(section, slug);

  if (!article) notFound();

  const breadcrumb = (
    <Link href={article.backHref} className="public-breadcrumb">
      ← {article.backLabel}
    </Link>
  );

  const cover = article.cover ? (
    <div className="public-article-cover">
      <Image
        src={article.cover.src}
        alt={article.cover.alt}
        fill
        priority
        sizes="(max-width: 1100px) 100vw, 680px"
        className="public-article-cover-img"
      />
    </div>
  ) : null;

  return (
    <PublicSiteShell>
      <div className="public-article-page">
        <ArticleExperience
          title={article.title}
          preview={article.preview}
          cover={cover}
          breadcrumb={breadcrumb}
          contents={
            article.richDemo
              ? {
                  ru: DEMO_ARTICLE.content_md,
                  en: DEMO_ARTICLE.content_md_en,
                  es: DEMO_ARTICLE.content_md_es,
                }
              : { ru: article.content_md, en: "", es: "" }
          }
          terms={article.terms}
          videoYoutubeId={article.richDemo ? DEMO_ARTICLE.videoYoutubeId : null}
          hasAudio={article.richDemo}
          hasPresentation={article.richDemo}
        />

        <RecommendedArticles items={article.related} heading="Рекомендую" />
      </div>
    </PublicSiteShell>
  );
}
