import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const sourcePath = join(publicDir, "app-icon-source.png");

const outputs = [
  { file: "apple-touch-icon.png", size: 180 },
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "favicon.png", size: 32 },
];

async function main() {
  if (!existsSync(sourcePath)) {
    console.log(
      "Source icon not found. Place your PNG at public/app-icon-source.png and run: npm run icons"
    );
    process.exit(0);
  }

  const image = sharp(sourcePath).rotate().resize(1024, 1024, {
    fit: "cover",
    position: "centre",
  });

  for (const { file, size } of outputs) {
    const target = join(publicDir, file);
    await image
      .clone()
      .resize(size, size, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 9, palette: false })
      .toFile(target);
    console.log(`Wrote ${file} (${size}x${size})`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
