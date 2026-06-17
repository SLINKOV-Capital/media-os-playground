export const DEFAULT_DOCUMENT_TYPES = [
  "article",
  "guide",
  "newsletter",
  "podcast",
  "video",
];

export function mergeDocumentTypes(...groups: string[][]): string[] {
  return [...new Set([...DEFAULT_DOCUMENT_TYPES, ...groups.flat()])].sort(
    (a, b) => a.localeCompare(b, "ru")
  );
}
