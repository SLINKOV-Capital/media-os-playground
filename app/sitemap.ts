import { fetchPublishedDocumentsForSitemap } from "@/lib/publicSite";
import {
  PUBLIC_SITE_ORIGIN,
  publicDocumentPathForType,
} from "@/lib/site";
import type { MetadataRoute } from "next";

const STATIC_PATHS = [
  "/ru",
  "/ru/articles",
  "/ru/stories",
  "/ru/books",
  "/ru/plays",
  "/ru/video",
  "/ru/glossary",
  "/ru/presentations",
  "/ru/consulting",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const documents = await fetchPublishedDocumentsForSitemap();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: new URL(path, PUBLIC_SITE_ORIGIN).toString(),
    changeFrequency: path === "/ru" ? "weekly" : "monthly",
    priority: path === "/ru" ? 1 : 0.7,
  }));

  const documentEntries: MetadataRoute.Sitemap = documents.flatMap(
    (document) => {
      if (!document.site_slug) return [];
      return [
        {
          url: new URL(
            publicDocumentPathForType(
              document.site_slug,
              document.document_type,
              document.site_locale
            ),
            PUBLIC_SITE_ORIGIN
          ).toString(),
          lastModified: document.site_published_at ?? undefined,
          changeFrequency: "monthly" as const,
          priority: 0.8,
        },
      ];
    }
  );

  return [...staticEntries, ...documentEntries];
}
