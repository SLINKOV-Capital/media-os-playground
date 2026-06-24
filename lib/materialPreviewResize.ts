const MAX_LONG_EDGE = 400;
const WEBP_QUALITY = 0.85;

export async function resizeImageToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const longEdge = Math.max(width, height);
  const scale = longEdge > MAX_LONG_EDGE ? MAX_LONG_EDGE / longEdge : 1;
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("canvas_unavailable");
  }

  context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY);
  });

  if (!blob) {
    throw new Error("encode_failed");
  }

  return blob;
}
