// scripts/clean-logo.mjs
//
// public/data/Logo.jpeg is the crest at real resolution (1089x1600) on a
// pure black background (JPEG, no alpha channel at all). Flood-fills the
// black background to transparent — see scripts/lib/flood-key.mjs.
//
// Run with: node scripts/clean-logo.mjs
// Output: public/data/Logo_cutout.png

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { floodKeyBackground } from "./lib/flood-key.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "public", "data");
const BLACK_THRESHOLD = 18; // r,g,b <= this counts as "background-ish black"

async function main() {
  const srcPath = path.join(DATA_DIR, "Logo.jpeg");
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const { buffer, erased, total } = await floodKeyBackground(data, info, (r, g, b) => {
    return r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD;
  });

  const outPath = path.join(DATA_DIR, "Logo_cutout.png");
  await sharp(buffer, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toFile(outPath);

  console.log(`Logo.jpeg: erased ${erased}/${total} px (${((erased / total) * 100).toFixed(1)}%) -> Logo_cutout.png`);
}

main();
