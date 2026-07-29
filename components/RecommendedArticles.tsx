import Image from "next/image";
import Link from "next/link";

export type RecommendedArticleCard = {
  href: string;
  title: string;
  preview: string;
  image?: string | null;
};

type RecommendedArticlesProps = {
  items: readonly RecommendedArticleCard[];
  heading?: string;
};

/** Medium-like 2×N grid: cover → title → preview. No engagement chrome. */
export function RecommendedArticles({
  items,
  heading = "Рекомендованные статьи",
}: RecommendedArticlesProps) {
  if (items.length === 0) return null;

  return (
    <section className="public-recommended" aria-labelledby="public-recommended-heading">
      <h2 id="public-recommended-heading" className="public-recommended-heading">
        {heading}
      </h2>
      <ul className="public-recommended-grid">
        {items.map((item) => (
          <li key={`${item.href}-${item.title}`} className="public-recommended-item">
            <Link href={item.href} className="public-recommended-card">
              <span className="public-recommended-media" aria-hidden="true">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="(max-width: 767px) 100vw, 340px"
                    className="public-recommended-img"
                  />
                ) : null}
              </span>
              <span className="public-recommended-title">{item.title}</span>
              <span className="public-recommended-preview">{item.preview}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
