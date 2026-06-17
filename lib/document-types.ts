export function mergeDocumentTypes(...groups: string[][]): string[] {
  return [...new Set(groups.flat().map((type) => type.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "ru")
  );
}
