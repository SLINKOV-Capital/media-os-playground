type MaterialPreviewSource = {
  preview_url?: string | null;
};

export function getMaterialPreviewSrc(
  material: MaterialPreviewSource
): string | null {
  const url = material.preview_url?.trim();
  return url || null;
}
