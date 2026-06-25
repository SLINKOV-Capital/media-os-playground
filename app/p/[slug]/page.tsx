import { MarkdownContent } from "@/components/MarkdownContent";
import { MaterialImagePreview } from "@/components/MaterialImagePreview";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import { getMaterialTypeIcon } from "@/lib/materialTypes";
import { getMaterialPreviewSrc } from "@/lib/materialPreview";
import {
  fetchPublishedDocumentBySlug,
  fetchPublishedDocumentMaterials,
} from "@/lib/publicSite";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type PublicDocumentPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PublicDocumentPageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = await fetchPublishedDocumentBySlug(slug);

  if (!document) {
    return { title: "Не найдено" };
  }

  return {
    title: document.title,
    description: document.preview ?? undefined,
  };
}

export default async function PublicDocumentPage({
  params,
}: PublicDocumentPageProps) {
  const { slug } = await params;
  const document = await fetchPublishedDocumentBySlug(slug);

  if (!document) {
    notFound();
  }

  const materials = await fetchPublishedDocumentMaterials(document.id);

  return (
    <PublicSiteShell>
      <article className="public-article">
        <Link href="/" className="public-breadcrumb">
          ← На главную
        </Link>

        <p className="public-article-type">{document.document_type}</p>
        <h1 className="public-article-title">{document.title}</h1>

        {document.preview && (
          <p className="public-article-preview">{document.preview}</p>
        )}

        <MarkdownContent
          content={document.content_md ?? ""}
          className="public-article-content markdown-content"
        />

        {materials.length > 0 && (
          <section className="public-materials">
            <h2 className="public-section-title">Материалы</h2>
            <ul className="public-material-list">
              {materials.map((material) => {
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
                      {material.file_url_or_path && (
                        <a
                          href={material.file_url_or_path}
                          className="public-material-link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {material.file_url_or_path}
                        </a>
                      )}
                      {material.notes && (
                        <MarkdownContent
                          content={material.notes}
                          className="public-material-notes markdown-content"
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </article>
    </PublicSiteShell>
  );
}
