export const PUBLIC_SITE_EMAIL = "hello@soloten.com";
export const LATEST_PUBLISHED_LIMIT = 6;

export function publicDocumentPath(slug: string): string {
  return `/p/${slug}`;
}

export function isDocumentSiteLocked(document: {
  site_published_at: string | null;
}): boolean {
  return document.site_published_at != null;
}

export function siteStatusLabel(site_status: string): string {
  return site_status === "published" ? "Опубликован" : "Черновик";
}
