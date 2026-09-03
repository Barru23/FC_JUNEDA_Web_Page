// scripts/clean-jersey-art.mjs
//
// public/data/jersey_front.png and jersey_back.png are NOT proper cutouts:
// despite carrying an alpha channel, ~98% of pixels are fully opaque white
// (a flat artboard background), with only the very tightest corners actually
// transparent. See scripts/lib/flood-key.mjs for why a simple colour-key
// would also erase the artwork's own whites (the gap logo, the dorsal, the
// sponsor text).
//
// Run with: node scripts/clean-jersey-art.mjs
// Output: public/data/<name>_cutout.png (originals are left untouched — they
// are still read by the outgoing 2D viewer until it is retired).

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { floodKeyBackground } from "./lib/flood-key.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "public", "data");

const FILES = ["jersey_front.png", "jersey_back.png"];
const WHITE_THRESHOLD = 244;

async function cleanOne(name) {
  const srcPath = path.join(DATA_DIR, name);
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const { buffer, erased, total } = await floodKeyBackground(data, info, (r, g, b, a) => {
    return a === 0 || (a > 0 && r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD);
  });

  const outPath = path.join(DATA_DIR, name.replace(".png", "_cutout.png"));
  await sharp(buffer, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toFile(outPath);

  console.log(`${name}: erased ${erased}/${total} px (${((erased / total) * 100).toFixed(1)}%) -> ${path.basename(outPath)}`);
}

for (const name of FILES) {
  await cleanOne(name);
}
