import type { PlaceholderItem } from "@/lib/publicContent";
import { publicDocumentPath } from "@/lib/site";
import type { PublicDocument } from "@/lib/types";
import Link from "next/link";

type PublicWorkCardProps = {
  title: string;
  type: string;
  preview?: string | null;
  href: string;
  size?: "sm" | "md" | "lg";
};

export function PublicWorkCard({
  title,
  type,
  preview,
  href,
  size = "md",
}: PublicWorkCardProps) {
  return (
    <article className={`public-work-card public-work-card-${size}`}>
      <Link href={href} className="public-work-card-link">
        <div className="public-work-card-media" aria-hidden="true" />
        <h3 className="public-work-card-title">{title}</h3>
        <p className="public-work-card-type">{type}</p>
        {preview && <p className="public-work-card-preview">{preview}</p>}
      </Link>
    </article>
  );
}

export function workFromDocument(document: PublicDocument): PublicWorkCardProps | null {
  if (!document.site_slug) {
    return null;
  }

  return {
    title: document.title,
    type: document.document_type,
    preview: document.preview,
    href: publicDocumentPath(document.site_slug),
  };
}

export function workFromPlaceholder(
  item: PlaceholderItem,
  sectionPath: string
): PublicWorkCardProps {
  return {
    title: item.title,
    type: item.type,
    preview: item.preview,
    href: item.href ?? `${sectionPath}#${item.slug}`,
  };
}
