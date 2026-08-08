import { ArticleExperience } from "@/components/ArticleExperience";
import { MarkdownContent } from "@/components/MarkdownContent";
import { MaterialImagePreview } from "@/components/MaterialImagePreview";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { RecommendedArticles } from "@/components/RecommendedArticles";
import {
  DEMO_ARTICLE,
  DEMO_RELATED_ARTICLES,
  DEMO_TERMS,
} from "@/lib/demoArticle";
import { getMaterialTypeIcon } from "@/lib/materialTypes";
import { getMaterialPreviewSrc } from "@/lib/materialPreview";
import { publicDocumentSection } from "@/lib/site";
import {
  fetchPublishedDocumentBySlug,
  fetchPublishedDocumentMaterials,
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
  cover: string | null;
  document_type?: string;
  materials: Awaited<ReturnType<typeof fetchPublishedDocumentMaterials>>;
  related: typeof DEMO_RELATED_ARTICLES | [];
  backHref: string;
  backLabel: string;
  richDemo: boolean;
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
      cover: DEMO_ARTICLE.cover,
      materials: [],
      related: DEMO_RELATED_ARTICLES,
      backHref: "/articles",
      backLabel: "Статьи",
      richDemo: true,
    };
  }

  const document = await fetchPublishedDocumentBySlug(slug);
  if (!document) return null;

  const materials = await fetchPublishedDocumentMaterials(document.id);
  const section = publicDocumentSection(document.document_type);

  return {
    title: document.title,
    preview: document.preview,
    content_md: document.content_md ?? "",
    cover: null,
    document_type: document.document_type,
    materials,
    related: [],
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

  const materialsBlock =
    article.materials.length > 0 ? (
      <section className="public-materials">
        <h2 className="public-section-heading">Материалы</h2>
        <ul className="public-material-list">
          {article.materials.map((material) => {
            const previewSrc = getMaterialPreviewSrc(material);

            return (
              <li key={material.id} className="public-material-item">
                <span className="public-material-leading" aria-hidden="true">
                  {previewSrc ? (
                    <MaterialImagePreview
                      src={previewSrc}
                      alt={material.title}
                      variant="thumb"
                    />
                  ) : (
                    <span className="material-type-icon material-type-icon-thumb">
                      {getMaterialTypeIcon(material.material_type)}
                    </span>
                  )}
                </span>
                <div className="public-material-body">
                  <p className="public-material-title">{material.title}</p>
                  <p className="public-material-meta">{material.material_type}</p>
                  {material.file_url_or_path ? (
                    <a
                      href={material.file_url_or_path}
                      className="public-material-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {material.file_url_or_path}
                    </a>
                  ) : null}
                  {material.notes ? (
                    <MarkdownContent
                      content={material.notes}
                      className="public-material-notes markdown-content"
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    ) : null;

  const breadcrumb = (
    <Link href={article.backHref} className="public-breadcrumb">
      ← {article.backLabel}
    </Link>
  );

  const cover = article.cover ? (
    <div className="public-article-cover">
      <Image
        src={article.cover}
        alt=""
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
        {article.richDemo ? (
          <ArticleExperience
            title={article.title}
            preview={article.preview}
            cover={cover}
            breadcrumb={breadcrumb}
            contents={{
              ru: DEMO_ARTICLE.content_md,
              en: DEMO_ARTICLE.content_md_en,
              es: DEMO_ARTICLE.content_md_es,
            }}
            terms={DEMO_TERMS}
            videoYoutubeId={DEMO_ARTICLE.videoYoutubeId}
            hasAudio
            hasPresentation
            materials={materialsBlock}
          />
        ) : (
          <article className="public-article">
            {breadcrumb}
            {cover}
            <h1 className="public-article-title">{article.title}</h1>
            {article.preview ? (
              <p className="public-article-preview">{article.preview}</p>
            ) : null}
            <MarkdownContent
              content={article.content_md}
              className="public-article-content markdown-content"
            />
            {materialsBlock}
          </article>
        )}

        <RecommendedArticles items={article.related} />
      </div>
    </PublicSiteShell>
  );
}
