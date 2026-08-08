import type { createClient } from "@/lib/supabase/server";
import {
  getMaterialPreviewPublicUrl,
  MATERIAL_PREVIEWS_BUCKET,
  type MaterialPreviewExtension,
  materialPreviewStoragePath,
} from "@/lib/storagePaths";

const MAX_PREVIEW_BYTES = 524_288;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const CONTENT_TYPE_EXTENSIONS: Record<string, MaterialPreviewExtension> = {
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function parseCloudMailShareUrl(value: string): URL | null {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.hostname !== "cloud.mail.ru" ||
      !url.pathname.startsWith("/public/")
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getMetaAttributes(tag: string) {
  const attributes = new Map<string, string>();
  const pattern = /([\w:-]+)\s*=\s*(["'])(.*?)\2/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(tag))) {
    attributes.set(match[1].toLowerCase(), decodeHtmlAttribute(match[3]));
  }

  return attributes;
}

function extractCloudMailOgImage(html: string): URL | null {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = getMetaAttributes(match[0]);
    const property = attributes.get("property") ?? attributes.get("name");

    if (property?.toLowerCase() !== "og:image") {
      continue;
    }

    try {
      const url = new URL(attributes.get("content") ?? "");

      if (url.protocol === "https:" && url.hostname === "thumb.cloud.mail.ru") {
        return url;
      }
    } catch {
      return null;
    }
  }

  return null;
}

export async function importCloudMailImagePreview({
  supabase,
  userId,
  materialId,
  fileUrlOrPath,
}: {
  supabase: SupabaseServerClient;
  userId: string;
  materialId: string;
  fileUrlOrPath?: string | null;
}): Promise<string | null> {
  const shareUrl = parseCloudMailShareUrl(fileUrlOrPath?.trim() ?? "");

  if (!shareUrl) {
    return null;
  }

  try {
    const pageResponse = await fetch(shareUrl, {
      headers: { "User-Agent": "MediaOS-Cockpit/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!pageResponse.ok) {
      return null;
    }

    const imageUrl = extractCloudMailOgImage(await pageResponse.text());

    if (!imageUrl) {
      return null;
    }

    const imageResponse = await fetch(imageUrl, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
        "User-Agent": "MediaOS-Cockpit/1.0",
      },
      signal: AbortSignal.timeout(10_000),
    });
    const contentType = imageResponse.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();

    if (
      !imageResponse.ok ||
      !contentType ||
      !ALLOWED_CONTENT_TYPES.has(contentType)
    ) {
      return null;
    }

    const bytes = await imageResponse.arrayBuffer();

    if (bytes.byteLength === 0 || bytes.byteLength > MAX_PREVIEW_BYTES) {
      return null;
    }

    const extension = CONTENT_TYPE_EXTENSIONS[contentType];

    if (!extension) {
      return null;
    }

    const path = materialPreviewStoragePath(userId, materialId, extension);
    const { error: uploadError } = await supabase.storage
      .from(MATERIAL_PREVIEWS_BUCKET)
      .upload(path, bytes, {
        cacheControl: "31536000",
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to import Mail.ru material preview:", uploadError.message);
      return null;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    return supabaseUrl
      ? getMaterialPreviewPublicUrl(
          supabaseUrl,
          userId,
          materialId,
          extension
        )
      : null;
  } catch (error) {
    console.error("Failed to fetch Mail.ru material preview:", error);
    return null;
  }
}
