export const PUBLIC_SITE_EMAIL = "hello@soloten.com";
export const LATEST_PUBLISHED_LIMIT = 6;

export function publicDocumentPath(slug: string): string {
  return `/p/${slug}`;
}

export type PublicDocumentSection = "articles" | "stories" | null;

export function publicDocumentSection(
  documentType: string
): PublicDocumentSection {
  const normalized = documentType.trim().toLowerCase();

  if (normalized.includes("стат")) {
    return "articles";
  }

  if (normalized.includes("рассказ") || normalized.includes("истор")) {
    return "stories";
  }

  return null;
}

export function isDocumentSiteLocked(document: {
  site_published_at: string | null;
}): boolean {
  return document.site_published_at != null;
}

export function siteStatusLabel(site_status: string): string {
  return site_status === "published" ? "Опубликован" : "Черновик";
}
