export const PUBLIC_SITE_EMAIL = "hello@soloten.com";
export const PUBLIC_SITE_ORIGIN = "https://soloten.com";
export const LATEST_PUBLISHED_LIMIT = 6;

export const PUBLIC_LOCALES = ["ru", "en", "es"] as const;
export type PublicLocale = (typeof PUBLIC_LOCALES)[number];
export const DEFAULT_PUBLIC_LOCALE: PublicLocale = "ru";

export type PublicDocumentSection =
  | "articles"
  | "stories"
  | "books"
  | "plays"
  | "video"
  | "presentations"
  | null;

export const PUBLIC_DOCUMENT_SECTIONS = [
  "articles",
  "stories",
  "books",
  "plays",
  "video",
  "presentations",
] as const satisfies readonly Exclude<PublicDocumentSection, null>[];

export type PublicSectionSlug =
  | Exclude<PublicDocumentSection, null>
  | "glossary"
  | "consulting";

export function publicHomePath(locale: PublicLocale = DEFAULT_PUBLIC_LOCALE): string {
  return `/${locale}`;
}

export function publicSectionPath(
  section: PublicSectionSlug,
  locale: PublicLocale = DEFAULT_PUBLIC_LOCALE
): string {
  return `/${locale}/${section}`;
}

export function publicDocumentPath(
  slug: string,
  section: Exclude<PublicDocumentSection, null>,
  locale: PublicLocale = DEFAULT_PUBLIC_LOCALE
): string {
  return `${publicSectionPath(section, locale)}/${slug}`;
}

export function publicDocumentPathForType(
  slug: string,
  documentType: string,
  locale: PublicLocale = DEFAULT_PUBLIC_LOCALE
): string {
  const section = publicDocumentSection(documentType);
  return section
    ? publicDocumentPath(slug, section, locale)
    : `${publicHomePath(locale)}/${slug}`;
}

export function publicCandidateDocumentPaths(
  slug: string,
  locale: PublicLocale = DEFAULT_PUBLIC_LOCALE
): string[] {
  return PUBLIC_DOCUMENT_SECTIONS.map((section) =>
    publicDocumentPath(slug, section, locale)
  );
}

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

  if (normalized.includes("книг") || normalized.includes("роман")) {
    return "books";
  }

  if (normalized.includes("пьес")) {
    return "plays";
  }

  if (
    normalized.includes("видео") ||
    normalized.includes("подкаст") ||
    normalized.includes("аудио")
  ) {
    return "video";
  }

  if (normalized.includes("презентац")) {
    return "presentations";
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
