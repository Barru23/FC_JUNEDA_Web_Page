// scripts/optimize-kit-photos.mjs
//
// The Gemini-generated studio photos of the real jersey
// (public/data/Gemini_Generated_Image_*.jpg) are 1856x2274 and ~2.3 MB each —
// far larger than a product-shot viewer ever displays them at. This resizes
// to a sensible max width and re-encodes as JPEG at a web-friendly quality,
// writing public/data/kit-front.jpg / kit-back.jpg. The Gemini originals are
// left untouched as source material.
//
// Run with: node scripts/optimize-kit-photos.mjs

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "public", "data");

const MAX_WIDTH = 1200;
const JPEG_QUALITY = 82;

const SOURCES = [
  { src: "Gemini_Generated_Image_xezucexezucexezu.jpg", out: "kit-front.jpg" },
  { src: "Gemini_Generated_Image_xo36myxo36myxo36.jpg", out: "kit-back.jpg" },
];

for (const { src, out } of SOURCES) {
  const srcPath = path.join(DATA_DIR, src);
  const outPath = path.join(DATA_DIR, out);

  await sharp(srcPath)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(outPath);

  const srcSize = statSync(srcPath).size;
  const outSize = statSync(outPath).size;
  console.log(
    `${src} ${(srcSize / 1024).toFixed(0)} KB -> ${out} ${(outSize / 1024).toFixed(0)} KB ` +
    `(${(100 - (outSize / srcSize) * 100).toFixed(0)}% smaller)`
  );
}
