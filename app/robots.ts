import { PUBLIC_SITE_ORIGIN } from "@/lib/site";
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host")?.split(":")[0] ?? "";

  if (host === "app.soloten.com") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/auth",
        "/documents",
        "/materials",
        "/nihuyasi",
        "/slinkov-cockpit-login",
        "/templates",
        "/today",
      ],
    },
    sitemap: `${PUBLIC_SITE_ORIGIN}/sitemap.xml`,
    host: PUBLIC_SITE_ORIGIN,
  };
}
