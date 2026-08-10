import { ArticleExperience } from "@/components/ArticleExperience";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { RecommendedArticles, type RecommendedArticleCard } from "@/components/RecommendedArticles";
import {
  DEMO_ARTICLE,
  DEMO_RELATED_ARTICLES,
  DEMO_TERMS,
} from "@/lib/demoArticle";
import type { DemoTerm } from "@/lib/demoArticle";
import { publicDocumentSection } from "@/lib/site";
import {
  fetchPublishedDocumentBySlug,
  fetchPublishedDocumentCover,
  fetchPublishedDocumentRecommendations,
  fetchPublishedDocumentTerms,
} from "@/lib/publicSite";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

type PublicDocumentPageProps = {
  params: Promise<{ slug: string }>;
};

type ArticleView = {
  title: string;
  preview: string | null;
  content_md: string;
  cover: { src: string; alt: string } | null;
  document_type?: string;
  related: readonly RecommendedArticleCard[];
  backHref: string;
  backLabel: string;
  richDemo: boolean;
  terms: DemoTerm[];
};

export async function generateMetadata({
  params,
}: PublicDocumentPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (slug === DEMO_ARTICLE.slug) {
    return {
      title: `${DEMO_ARTICLE.title} — SLINKOV MEDIA`,
      description: DEMO_ARTICLE.preview,
    };
  }

  const document = await fetchPublishedDocumentBySlug(slug);

  if (!document) {
    return { title: "Не найдено" };
  }

  return {
    title: document.title,
    description: document.preview ?? undefined,
  };
}

async function resolveArticle(slug: string): Promise<ArticleView | null> {
  if (slug === DEMO_ARTICLE.slug) {
    return {
      title: DEMO_ARTICLE.title,
      preview: DEMO_ARTICLE.preview,
      content_md: DEMO_ARTICLE.content_md,
      cover: DEMO_ARTICLE.cover
        ? { src: DEMO_ARTICLE.cover, alt: DEMO_ARTICLE.title }
        : null,
      related: DEMO_RELATED_ARTICLES,
      backHref: "/articles",
      backLabel: "Статьи",
      richDemo: true,
      terms: DEMO_TERMS,
    };
  }

  const document = await fetchPublishedDocumentBySlug(slug);
  if (!document) return null;

  const [publicationCover, related, terms] = await Promise.all([
    fetchPublishedDocumentCover(document.id),
    fetchPublishedDocumentRecommendations(document.id),
    fetchPublishedDocumentTerms(document.id),
  ]);
  const section = publicDocumentSection(document.document_type);

  return {
    title: document.title,
    preview: document.preview,
    content_md: document.content_md ?? "",
    cover: publicationCover
      ? { src: publicationCover.image_url, alt: publicationCover.alt }
      : null,
    document_type: document.document_type,
    related,
    terms,
    backHref:
      section === "articles" ? "/articles" : section === "stories" ? "/stories" : "/",
    backLabel:
      section === "articles" ? "Статьи" : section === "stories" ? "Рассказы" : "На главную",
    richDemo: false,
  };
}

export default async function PublicDocumentPage({
  params,
}: PublicDocumentPageProps) {
  const { slug } = await params;
  const article = await resolveArticle(slug);

  if (!article) {
    notFound();
  }

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
