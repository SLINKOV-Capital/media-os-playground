import { PublicSiteShell } from "@/components/PublicSiteShell";
import type { PlaceholderItem, PublicSection } from "@/lib/publicContent";
import Image from "next/image";
import Link from "next/link";

type ArticlesIndexProps = {
  section: PublicSection;
  items?: PlaceholderItem[];
};

export function ArticlesIndex({ section, items = section.items }: ArticlesIndexProps) {
  return (
    <PublicSiteShell>
      <div className="public-articles">
        <header className="public-articles-head">
          <h1 className="public-home-label public-articles-label">
            {section.eyebrow}
          </h1>
          <p className="public-articles-intro">{section.intro}</p>
        </header>

        <ul className="public-articles-list">
          {items.map((item) => {
            const href = item.href ?? `/p/${item.slug}`;

            return (
              <li key={item.slug} className="public-articles-item">
                <Link href={href} className="public-articles-row">
                  <span className="public-articles-thumb" aria-hidden="true">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="(max-width: 768px) 96px, 140px"
                        className="public-articles-thumb-img"
                      />
                    ) : null}
                  </span>
                  <span className="public-articles-copy">
                    <span className="public-articles-title">{item.title}</span>
                    <span className="public-articles-preview">{item.preview}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {items.length === 0 ? (
          <p className="public-lead">Здесь скоро появятся новые публикации.</p>
        ) : null}
      </div>
    </PublicSiteShell>
  );
}
