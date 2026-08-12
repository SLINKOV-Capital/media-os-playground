export type MarkdownImage = {
  imageNumber: number;
  alt: string;
  src: string;
  title: string | null;
  start: number;
  end: number;
};

export type DocumentImageIssueInput = Pick<
  MarkdownImage,
  "imageNumber" | "alt" | "title" | "src"
> & { reason: string };

const MARKDOWN_IMAGE_PATTERN =
  /!\[((?:\\.|[^\]\\])*)\]\(\s*(?:<([^>\n]+)>|((?:\\.|[^\s)])+?))(?:\s+"((?:\\.|[^"\\])*)")?\s*\)/g;
const EXPORTED_IMAGE_PATTERN =
  /!\[((?:\\.|[^\]\\])*)\]<\(\s*([^>\n]+)>\s*(?:"((?:\\.|[^"\\])*)")?\s*\)/g;

function unescapeMarkdown(value: string) {
  return value.replace(/\\([\\\]"()])/g, "$1");
}

export function parseMarkdownImages(markdown: string): MarkdownImage[] {
  const standard = [...markdown.matchAll(MARKDOWN_IMAGE_PATTERN)].map((match) => ({
    alt: unescapeMarkdown(match[1] ?? ""),
    src: unescapeMarkdown(match[2] ?? match[3] ?? ""),
    title: match[4] == null ? null : unescapeMarkdown(match[4]),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
  const exported = [...markdown.matchAll(EXPORTED_IMAGE_PATTERN)].map((match) => ({
    alt: unescapeMarkdown(match[1] ?? ""),
    src: unescapeMarkdown(match[2] ?? ""),
    title: match[3] == null ? null : unescapeMarkdown(match[3]),
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

  return [...standard, ...exported]
    .sort((a, b) => a.start - b.start)
    .map((image, index) => ({ ...image, imageNumber: index + 1 }));
}

export function isWorkingMarkdownImageSrc(src: string) {
  try {
    const url = new URL(src);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function escapeAlt(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\]/g, "\\]");
}

function escapeTitle(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function markdownImageSyntax(image: MarkdownImage, src: string) {
  const title = image.title ? ` "${escapeTitle(image.title)}"` : "";
  return `![${escapeAlt(image.alt)}](${src}${title})`;
}

export function replaceMarkdownImage(
  markdown: string,
  image: MarkdownImage,
  src: string
) {
  return `${markdown.slice(0, image.start)}${markdownImageSyntax(image, src)}${markdown.slice(image.end)}`;
}

export function replaceMarkdownImages(
  markdown: string,
  replacements: Map<number, string | null>
) {
  return [...parseMarkdownImages(markdown)]
    .reverse()
    .reduce(
      (current, image) =>
        replacements.has(image.imageNumber)
          ? replacements.get(image.imageNumber) == null
            ? `${current.slice(0, image.start)}${current.slice(image.end)}`
            : replaceMarkdownImage(current, image, replacements.get(image.imageNumber)!)
          : current,
      markdown
    );
}

export function issuesForMarkdown(markdown: string): DocumentImageIssueInput[] {
  return parseMarkdownImages(markdown)
    .filter((image) => !isWorkingMarkdownImageSrc(image.src))
    .map((image) => ({
      imageNumber: image.imageNumber,
      alt: image.alt,
      title: image.title,
      src: image.src,
      reason: "Локальный файл изображения не загружен",
    }));
}

export function stripUnresolvedMarkdownImages(markdown: string) {
  return [...parseMarkdownImages(markdown)]
    .filter((image) => !isWorkingMarkdownImageSrc(image.src))
    .reverse()
    .reduce(
      (current, image) => `${current.slice(0, image.start)}${current.slice(image.end)}`,
      markdown
    );
}

export function normalizeLocalImagePath(value: string) {
  let decoded = value.trim().replace(/\\/g, "/");
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep the original spelling when the path contains invalid escapes.
  }
  return decoded.replace(/^\.\//, "").replace(/^\/+/, "");
}
