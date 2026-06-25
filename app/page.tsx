import { PublicDocumentCard } from "@/components/PublicDocumentCard";
import { PublicSiteShell } from "@/components/PublicSiteShell";
import {
  fetchFeaturedPublishedDocuments,
  fetchLatestPublishedDocuments,
} from "@/lib/publicSite";
import { PUBLIC_SITE_EMAIL } from "@/lib/site";
import type { PublicDocument } from "@/lib/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Дмитрий Слиньков",
  description:
    "Писатель. Консультант по ИИ. Автор проектов на стыке технологий и человеческих историй.",
};

function dedupeDocuments(
  featured: PublicDocument[],
  latest: PublicDocument[]
): PublicDocument[] {
  const featuredIds = new Set(featured.map((document) => document.id));

  return latest.filter((document) => !featuredIds.has(document.id));
}

export default async function HomePage() {
  const [featured, latest] = await Promise.all([
    fetchFeaturedPublishedDocuments(),
    fetchLatestPublishedDocuments(),
  ]);

  const latestWithoutFeatured = dedupeDocuments(featured, latest);

  return (
    <PublicSiteShell>
      <section className="public-hero">
        <h1 className="public-hero-title">Дмитрий Слиньков</h1>
        <p className="public-hero-lead">
          Писатель.
          <br />
          Консультант по ИИ.
          <br />
          Автор проектов на стыке технологий и человеческих историй.
        </p>
        <a className="public-cta-button" href={`mailto:${PUBLIC_SITE_EMAIL}`}>
          Запросить консультацию
        </a>
      </section>

      {featured.length > 0 && (
        <section className="public-section">
          <h2 className="public-section-title">Избранное</h2>
          <div className="public-doc-grid">
            {featured.map((document) => (
              <PublicDocumentCard key={document.id} document={document} />
            ))}
          </div>
        </section>
      )}

      {latestWithoutFeatured.length > 0 && (
        <section className="public-section">
          <h2 className="public-section-title">Последние публикации</h2>
          <div className="public-doc-grid">
            {latestWithoutFeatured.map((document) => (
              <PublicDocumentCard key={document.id} document={document} />
            ))}
          </div>
        </section>
      )}
    </PublicSiteShell>
  );
}
