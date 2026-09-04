// scripts/build-cromos.mjs
//
// The club's 30 official cromos (assets/cromos-source/*.png) are 1080x1080
// Instagram *posters*: the card itself sits centred on a decorative red/blue
// watercolour-smoke background with a drop shadow, in RGB with no alpha at
// all. Dropped straight onto the dark 3D pitch that background would read as
// a big square, not as a card — so this crops the card out of the poster,
// normalises both templates onto one aspect ratio, and rounds the corners
// into the alpha channel.
//
// Two templates, both perfectly axis-aligned (verified: the left edge sits on
// the same pixel at y=200 and y=900 — no rotation to correct):
//   - player (red frame,  25 cards): 202,76 -> 840,955   (639x880, ar 0.726)
//   - staff  (navy frame,  5 cards): 182,67 -> 888,1021  (707x955, ar 0.740)
// Both are normalised to 512x698 (ar 0.7335), a <2% stretch nobody can see,
// so every card shares one plane geometry in the scene.
//
// Run with: node scripts/build-cromos.mjs
// Output: public/cromos/<slug>.webp (on-pitch) + <slug>@2x.webp (zoomed card)

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, readdirSync, statSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, "..", "assets", "cromos-source");
const OUT_DIR = path.join(__dirname, "..", "public", "cromos");

// One card, two resolutions: the small one is what sits on the pitch (up to
// 30 at once), the 2x is loaded for the single card flown toward the camera.
const SIZES = [
  { suffix: "", width: 512, height: 698 },
  { suffix: "@2x", width: 1024, height: 1396 },
];
const CORNER_RADIUS_RATIO = 0.05; // measured ~30px on a 639px-wide card

// Expected crop per template. Each card is still measured individually below;
// these are the reference the measurement is checked against, so a card built
// from a slightly different template gets flagged instead of silently
// mis-cropped.
const TEMPLATES = {
  player: { left: 202, top: 77, right: 828, bottom: 942 },
  staff: { left: 182, top: 67, right: 888, bottom: 1021 },
};
const CROP_TOLERANCE = 4; // px

// The source filenames are inconsistent (spaces, accents, "Còpia de "
// prefixes, one lowercase), and several are nicknames rather than names — so
// the file -> player mapping is spelled out rather than derived.
const CROMOS = [
  { file: "POL CULLERÉ.png", slug: "pol-cullere" },
  { file: "ERIC.png", slug: "eric-lahuerta" },
  { file: "REDA.png", slug: "reda-assiad" },
  { file: "CUSI.png", slug: "david-cusine" },
  { file: "MARC PIFARRÉ.png", slug: "marc-pifarre" },
  { file: "SANTI.png", slug: "santi-rodriguez" },
  { file: "IVAN.png", slug: "ivan-lahuerta" },
  { file: "Còpia de ADAM.png", slug: "adam-baja" },
  { file: "albert capde.png", slug: "albert-capdevila" },
  { file: "TUTO.png", slug: "oriol-tuto" },
  { file: "Còpia de COIXA.png", slug: "marcel-coixa" },
  { file: "FARRA.png", slug: "carles-farrando" },
  { file: "POL MORALES.png", slug: "pol-morales" },
  { file: "POL FARRE.png", slug: "pol-farre" },
  { file: "NIL FEBRER.png", slug: "nil-febrer" },
  { file: "SERGI SOLÉ.png", slug: "sergi-sole" },
  { file: "RAMON SANS.png", slug: "ramon-sans" },
  { file: "LIJARCIO.png", slug: "lijarcio" },
  { file: "MAYO.png", slug: "toni-mayoral" },
  { file: "MITI.png", slug: "mateu-cabal" },
  { file: "XAVI SÁNCHEZ.png", slug: "xavi-sanchez" },
  { file: "ZAKA.png", slug: "zakaria-elabb" },
  { file: "BEAMUD.png", slug: "javier-beamud" },
  { file: "JORDI USALL.png", slug: "jordi-usall" },
  { file: "BAYU.png", slug: "ramon-bayona" },
  // Cos tècnic — navy template
  { file: "ISAAC VIDAL.png", slug: "isaac-vidal" },
  { file: "PAU BARRUFET.png", slug: "pau-barrufet" },
  { file: "JAN GELONCH.png", slug: "jan-gelonch" },
  { file: "CARLA HOMS.png", slug: "carla-homs" },
  { file: "SERGI BARRUFET.png", slug: "sergi-barrufet" },
];

/** Is this pixel part of a card frame (pure brand red / navy / royal blue)?
 *  The poster's smoke background is the same hues but desaturated and washed
 *  out, so the saturation floor is what separates card from backdrop. */
function isFrameColor(r, g, b) {
  // Tight enough that the poster's watercolour-smoke backdrop (same hues,
  // desaturated) never triggers a false hit — verified against every source
  // file; a looser g/b window here lets ~20-40 stray smoke pixels per column
  // through, which is enough to fool the >25-hit threshold below.
  const pureRed = r > 140 && g < 16 && b < 45;
  const navy = r < 25 && g > 20 && g < 50 && b > 60 && b < 115;
  const royalBlue = r < 25 && g > 55 && g < 95 && b > 140 && b < 200;
  return pureRed || navy || royalBlue;
}

/** Measures the card's bounding box inside the poster by finding where each
 *  edge's frame colour is present across most of the opposite dimension
 *  (i.e. the left edge is a column that's frame-coloured for most of the
 *  card's height). A low absolute pixel count isn't enough of a threshold —
 *  the staff card's smoke backdrop is itself fairly saturated blue and racks
 *  up scattered hits (up to ~25% of a column) well outside the real card —
 *  but the true border is solid for 85%+ of the span, so a majority
 *  threshold cleanly separates the two. */
function measureCard(data, width, height) {
  const colHits = new Int32Array(width);
  const rowHits = new Int32Array(height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      if (isFrameColor(data[i], data[i + 1], data[i + 2])) {
        colHits[x]++;
        rowHits[y]++;
      }
    }
  }

  const firstAbove = (arr, threshold) => arr.findIndex((v) => v > threshold);
  const lastAbove = (arr, threshold) => {
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i] > threshold) return i;
    return -1;
  };

  const colThreshold = height * 0.5;
  const rowThreshold = width * 0.5;

  return {
    left: firstAbove(colHits, colThreshold),
    right: lastAbove(colHits, colThreshold),
    top: firstAbove(rowHits, rowThreshold),
    bottom: lastAbove(rowHits, rowThreshold),
  };
}

function roundedMask(width, height, radius) {
  return Buffer.from(
    `<svg width="${width}" height="${height}">` +
      `<rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/>` +
      `</svg>`
  );
}

async function buildOne({ file, slug }) {
  const srcPath = path.join(SRC_DIR, file);
  const { data, info } = await sharp(srcPath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // Template detection: at (800, 540) the player card shows its red side
  // band, the staff card its royal-blue one.
  const probe = (540 * width + 800) * 3;
  const kind = data[probe] > 120 && data[probe + 1] < 80 ? "player" : "staff";
  const expected = TEMPLATES[kind];

  const box = measureCard(data, width, height);

  const warnings = [];
  for (const edge of ["left", "top", "right", "bottom"]) {
    const delta = box[edge] - expected[edge];
    if (!Number.isFinite(box[edge]) || box[edge] < 0 || Math.abs(delta) > CROP_TOLERANCE) {
      warnings.push(`${edge} ${box[edge]} (expected ${expected[edge]}, off by ${delta})`);
      box[edge] = expected[edge]; // fall back rather than crop into the artwork
    }
  }

  const crop = {
    left: box.left,
    top: box.top,
    width: box.right - box.left + 1,
    height: box.bottom - box.top + 1,
  };

  for (const { suffix, width: outW, height: outH } of SIZES) {
    const radius = Math.round(outW * CORNER_RADIUS_RATIO);
    await sharp(srcPath)
      .extract(crop)
      .resize(outW, outH, { fit: "fill" })
      .ensureAlpha()
      .composite([{ input: roundedMask(outW, outH, radius), blend: "dest-in" }])
      .webp({ quality: 82, alphaQuality: 100 })
      .toFile(path.join(OUT_DIR, `${slug}${suffix}.webp`));
  }

  const bytes = SIZES.reduce(
    (sum, { suffix }) => sum + statSync(path.join(OUT_DIR, `${slug}${suffix}.webp`)).size,
    0
  );

  return { slug, kind, crop, bytes, warnings };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const onDisk = new Set(readdirSync(SRC_DIR).filter((f) => f.toLowerCase().endsWith(".png")));
  const mapped = new Set(CROMOS.map((c) => c.file));
  for (const f of onDisk) if (!mapped.has(f)) console.warn(`! source not in CROMOS map, skipped: ${f}`);
  for (const f of mapped) if (!onDisk.has(f)) console.warn(`! mapped source missing on disk: ${f}`);

  let totalBytes = 0;
  let warned = 0;

  for (const cromo of CROMOS) {
    const { slug, kind, crop, bytes, warnings } = await buildOne(cromo);
    totalBytes += bytes;
    const note = warnings.length ? `  !! ${warnings.join("; ")}` : "";
    if (warnings.length) warned++;
    console.log(
      `${slug.padEnd(18)} ${kind.padEnd(6)} crop ${crop.width}x${crop.height} @${crop.left},${crop.top}` +
        `  ${(bytes / 1024).toFixed(0)} KB${note}`
    );
  }

  console.log(
    `\n${CROMOS.length} cromos -> ${CROMOS.length * SIZES.length} files, ` +
      `${(totalBytes / 1024 / 1024).toFixed(2)} MB total` +
      (warned ? `, ${warned} with crop warnings (fell back to template box)` : "")
  );
}

main();
