export const MAX_PREVIEW_INPUT_BYTES = 20 * 1024 * 1024;

const TARGET_WIDTH = 640;
const TARGET_ASPECT_RATIO = 16 / 9;
const MAX_OUTPUT_BYTES = 500 * 1024;

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
}

export async function resizeImageToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const sourceAspectRatio = bitmap.width / bitmap.height;
  const sourceWidth =
    sourceAspectRatio > TARGET_ASPECT_RATIO
      ? bitmap.height * TARGET_ASPECT_RATIO
      : bitmap.width;
  const sourceHeight =
    sourceAspectRatio > TARGET_ASPECT_RATIO
      ? bitmap.height
      : bitmap.width / TARGET_ASPECT_RATIO;
  const sourceX = (bitmap.width - sourceWidth) / 2;
  const sourceY = (bitmap.height - sourceHeight) / 2;
  const targetWidth = Math.min(TARGET_WIDTH, Math.round(sourceWidth));
  const targetHeight = Math.max(
    1,
    Math.round(targetWidth / TARGET_ASPECT_RATIO)
  );

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("canvas_unavailable");
  }

  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    targetWidth,
    targetHeight
  );
  bitmap.close();

  let quality = 0.85;
  let blob = await canvasToWebp(canvas, quality);

  while (blob && blob.size > MAX_OUTPUT_BYTES && quality > 0.45) {
    quality -= 0.1;
    blob = await canvasToWebp(canvas, quality);
  }

  if (!blob || blob.size > MAX_OUTPUT_BYTES) {
    throw new Error("encode_failed");
  }

  return blob;
}
