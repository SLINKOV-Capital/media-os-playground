import { publicDocumentPathForType } from "@/lib/site";
import type { PublicDocument } from "@/lib/types";
import Link from "next/link";

type PublicDocumentCardProps = {
  document: PublicDocument;
};

export function PublicDocumentCard({ document }: PublicDocumentCardProps) {
  if (!document.site_slug) {
    return null;
  }

  return (
    <article className="public-doc-card">
      <p className="public-doc-card-type">{document.document_type}</p>
      <h3 className="public-doc-card-title">
        <Link
          href={publicDocumentPathForType(
            document.site_slug,
            document.document_type,
            document.site_locale
          )}
        >
          {document.title}
        </Link>
      </h3>
      {document.preview && (
        <p className="public-doc-card-preview">{document.preview}</p>
      )}
    </article>
  );
}
