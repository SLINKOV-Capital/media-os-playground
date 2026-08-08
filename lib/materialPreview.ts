type MaterialPreviewSource = {
  preview_url?: string | null;
};

const DIRECT_IMAGE_PATH = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function parseWebUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function extractYouTubeVideoId(value: string): string | null {
  const url = parseWebUrl(value.trim());

  if (!url) {
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  let candidate: string | null = null;

  if (hostname === "youtu.be") {
    candidate = url.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (
    hostname === "youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "music.youtube.com" ||
    hostname === "youtube-nocookie.com"
  ) {
    if (url.pathname === "/watch") {
      candidate = url.searchParams.get("v");
    } else {
      const [section, id] = url.pathname.split("/").filter(Boolean);

      if (["embed", "live", "shorts"].includes(section)) {
        candidate = id ?? null;
      }
    }
  }

  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
}

export function deriveMaterialPreviewUrl(
  materialType: string,
  fileUrlOrPath?: string | null
): string | null {
  const value = fileUrlOrPath?.trim();

  if (!value) {
    return null;
  }

  if (materialType === "image") {
    const url = parseWebUrl(value);
    return url && DIRECT_IMAGE_PATH.test(url.pathname) ? url.toString() : null;
  }

  if (materialType === "youtube") {
    const videoId = extractYouTubeVideoId(value);
    return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : null;
  }

  return null;
}

export function getMaterialPreviewSrc(
  material: MaterialPreviewSource
): string | null {
  const url = material.preview_url?.trim();
  return url || null;
}
