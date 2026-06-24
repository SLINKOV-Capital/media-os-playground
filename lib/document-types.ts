export function listTemplateDocumentTypes(
  templates: { document_type: string }[]
): string[] {
  return [
    ...new Set(
      templates.map((template) => template.document_type.trim()).filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "ru"));
}

/** @deprecated Use listTemplateDocumentTypes — types come from templates only. */
export function mergeDocumentTypes(...groups: string[][]): string[] {
  return [...new Set(groups.flat().map((type) => type.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "ru")
  );
}
