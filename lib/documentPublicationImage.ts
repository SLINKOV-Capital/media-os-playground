import sharp from "sharp";

export const MAX_PUBLICATION_IMAGE_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_PUBLICATION_IMAGE_EDGE = 1920;
const MAX_REDIRECTS = 4;

function isPrivateHostname(hostname: string) {
  const value = hostname.toLowerCase();
  return (
    value === "localhost" ||
    value === "::1" ||
    value.endsWith(".local") ||
    /^127\./.test(value) ||
    /^10\./.test(value) ||
    /^192\.168\./.test(value) ||
    /^169\.254\./.test(value) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(value)
  );
}

function assertSafeHttpsUrl(value: string) {
  const url = new URL(value);

  if (url.protocol !== "https:" || isPrivateHostname(url.hostname)) {
    throw new Error("unsafe_source_url");
  }

  return url;
}

async function fetchWithLimits(
  url: URL,
  redirects = 0,
  referer?: string
): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*;q=0.1",
      "User-Agent": "MediaOS-Publisher/1.0",
      ...(referer ? { Referer: referer } : {}),
    },
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status >= 300 && response.status < 400) {
    if (redirects >= MAX_REDIRECTS) {
      throw new Error("too_many_redirects");
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error("invalid_redirect");
    }

    return fetchWithLimits(
      assertSafeHttpsUrl(new URL(location, url).toString()),
      redirects + 1,
      referer
    );
  }

  if (!response.ok) {
    throw new Error(`source_http_${response.status}`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_PUBLICATION_IMAGE_INPUT_BYTES) {
    throw new Error("source_too_large");
  }

  return response;
}

async function resolveCloudMailOriginalUrl(shareUrl: URL) {
  const response = await fetch(shareUrl, {
    headers: { "User-Agent": "MediaOS-Publisher/1.0" },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error("cloud_mail_resolve_failed");
  }

  const html = await response.text();
  const match = html.match(
    /"weblink_get"\s*:\s*\{[^}]*"url"\s*:\s*"(https:[^"\\]+)"/i
  );

  if (!match?.[1]) {
    throw new Error("cloud_mail_original_missing");
  }

  const base = match[1].replace(/\\\//g, "/").replace(/\/$/, "");
  const weblink = shareUrl.pathname.replace(/^\/public\//, "");
  return assertSafeHttpsUrl(`${base}/${weblink}`);
}

export async function downloadPublicationImage(source: string) {
  let url = assertSafeHttpsUrl(source.trim());
  let referer: string | undefined;

  if (
    url.hostname === "cloud.mail.ru" &&
    url.pathname.startsWith("/public/")
  ) {
    referer = url.toString();
    url = await resolveCloudMailOriginalUrl(url);
  }

  const response = await fetchWithLimits(url, 0, referer);
  const bytes = Buffer.from(await response.arrayBuffer());

  if (bytes.length === 0 || bytes.length > MAX_PUBLICATION_IMAGE_INPUT_BYTES) {
    throw new Error(bytes.length === 0 ? "source_empty" : "source_too_large");
  }

  return bytes;
}

export async function optimizePublicationImage(input: Buffer | ArrayBuffer) {
  const source = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const pipeline = sharp(source, {
    failOn: "error",
    limitInputPixels: 80_000_000,
  }).rotate();
  const metadata = await pipeline.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("invalid_image");
  }

  const { data, info } = await pipeline
    .resize({
      width: MAX_PUBLICATION_IMAGE_EDGE,
      height: MAX_PUBLICATION_IMAGE_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 84, effort: 5 })
    .toBuffer({ resolveWithObject: true });

  return { bytes: data, width: info.width, height: info.height };
}
