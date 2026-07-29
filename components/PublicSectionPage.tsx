import { PublicSiteShell } from "@/components/PublicSiteShell";
import { PublicWorkCard, workFromPlaceholder } from "@/components/PublicWorkCard";
import type { PublicSection } from "@/lib/publicContent";
import type { Metadata } from "next";
import Link from "next/link";

type PublicSectionPageProps = {
  section: PublicSection;
};

export function publicSectionMetadata(section: PublicSection): Metadata {
  return {
    title: `${section.title} — SLINKOV MEDIA`,
    description: section.intro,
  };
}

export function PublicSectionPage({ section }: PublicSectionPageProps) {
  return (
    <PublicSiteShell>
      <div className="public-page">
        <p className="public-eyebrow">{section.eyebrow}</p>
        <h1 className="public-display-title">{section.title}</h1>
        <p className="public-lead">{section.intro}</p>

        <ul className="public-item-list">
          {section.items.map((item) => {
            const work = workFromPlaceholder(item, section.path);

            return (
              <li key={item.slug} id={item.slug} className="public-item-row">
                <p className="public-item-type">{work.type}</p>
                <h2 className="public-item-title">
                  <Link href={work.href}>{work.title}</Link>
                </h2>
                <p className="public-item-preview">{work.preview}</p>
              </li>
            );
          })}
        </ul>

        <div className="public-works-grid public-works-grid-compact">
          {section.items.map((item, index) => (
            <PublicWorkCard
              key={item.slug}
              {...workFromPlaceholder(item, section.path)}
              size={index === 1 ? "lg" : "md"}
            />
          ))}
        </div>
      </div>
    </PublicSiteShell>
  );
}
