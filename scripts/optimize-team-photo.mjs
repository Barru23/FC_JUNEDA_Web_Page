// scripts/optimize-team-photo.mjs
//
// public/data/players/Plantilla.png is a 2560x1706, 5.7 MB source PNG with no
// alpha channel — far larger than the hero ever displays it at (the Image's
// `sizes` prop tops out at 780px logical width). It's also `priority`, so
// it's the page's LCP element on mobile. This resizes and re-encodes as a
// web-friendly JPEG, writing plantilla-team.jpg next to the source; the PNG
// original is left untouched as source material.
//
// Run with: node scripts/optimize-team-photo.mjs

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { statSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "public", "data", "players");

const SRC = "Plantilla.png";
const OUT = "plantilla-team.jpg";
const MAX_WIDTH = 1600;
const JPEG_QUALITY = 82;

const srcPath = path.join(DIR, SRC);
const outPath = path.join(DIR, OUT);

await sharp(srcPath)
  .resize({ width: MAX_WIDTH, withoutEnlargement: true })
  .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
  .toFile(outPath);

const srcSize = statSync(srcPath).size;
const outSize = statSync(outPath).size;
console.log(
  `${SRC} ${(srcSize / 1024 / 1024).toFixed(2)} MB -> ${OUT} ${(outSize / 1024).toFixed(0)} KB ` +
    `(${Math.round((1 - outSize / srcSize) * 100)}% smaller)`
);
