// lib/kit-texture.ts
//
// Builds the CF Juneda kit's front/back/sleeve textures at runtime, in the
// browser, from the real (low-resolution) jersey artwork plus a few sharp
// overlays. See scripts/clean-jersey-art.mjs and scripts/clean-logo.mjs for
// how the source PNGs were turned into proper cutouts (they arrive as
// product photos on an opaque white/black background, not transparent
// cutouts) — this module only composites the already-cleaned assets.
//
// Why layers instead of one flat decal: the source art is small
// (jersey_front_cutout.png is 363x386), so projecting it whole would look
// soft wherever the camera gets close. Everything that is plain typography
// is redrawn here as live, crisp canvas text at the real print's position;
// only genuinely irregular graphics (the "gap" sponsor mark, the masiatero
// tree icon) stay as the soft base bitmap, because there is no higher-
// resolution source for them and they are not worth vector-tracing.
//
// All anchor coordinates below were measured once, offline, against the
// actual PNGs (connected-component bounding boxes on the cleaned cutouts —
// see the conversation history, not a script in this repo) and hand-tuned
// against the live 3D render. They are specific to these exact source files.

import * as THREE from "three";

const FRONT_SRC = "/data/jersey_front_cutout.png";
const BACK_SRC = "/data/jersey_back_cutout.png";
const CREST_SRC = "/data/Logo_cutout.png";

const FRONT_W = 1024;
const FRONT_H = Math.round((FRONT_W * 386) / 363); // 1089, matches source aspect
const BACK_W = 1024;
const BACK_H = Math.round((BACK_W * 322) / 286); // 1155, matches source aspect

const CREST_ASPECT = 1089 / 1600; // Logo_cutout.png width/height

// Normalized (0-1) anchors measured on the source PNGs.
const ANCHORS = {
  crest: { cx: 0.669, cy: 0.262, heightFrac: 0.135 },
  gapCircle: { cx: 0.519, cy: 0.562, radiusFrac: 0.138 },
  hashtag: { cx: 0.505, cy: 0.244, heightFrac: 0.062 },
  masiatero: { cx: 0.459, cy: 0.826, heightFrac: 0.03 },
};

// Sleeve-badge crop, taken from the front cutout's left sleeve (the same
// swirl emblem appears — mirrored — on the right sleeve and on the back;
// one crop, reused and horizontally mirrored, keeps this from needing four
// near-duplicate small textures.
const SLEEVE_BADGE_CROP = { left: 33, top: 62, width: 58, height: 68 }; // px in the 363x386 front source

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawArcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  radius: number,
  startAngleRad: number,
  sweepRad: number,
  font: string,
  color: string
) {
  // Distributes glyphs evenly across `sweepRad`, each rotated to stay
  // tangent to the circle, text baseline pointing outward.
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const totalWidth = [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width, 0);
  const angleForWidth = sweepRad / Math.max(totalWidth, 1);

  let angle = startAngleRad;
  for (const ch of text) {
    const chWidth = ctx.measureText(ch).width;
    const chAngle = chWidth * angleForWidth;
    const mid = angle + chAngle / 2;

    ctx.save();
    ctx.translate(centerX + radius * Math.cos(mid), centerY + radius * Math.sin(mid));
    ctx.rotate(mid + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();

    angle += chAngle;
  }
  ctx.restore();
}

function drawCrest(ctx: CanvasRenderingContext2D, crest: HTMLImageElement, canvasW: number, canvasH: number) {
  const h = ANCHORS.crest.heightFrac * canvasH;
  const w = h * CREST_ASPECT;
  const cx = ANCHORS.crest.cx * canvasW;
  const cy = ANCHORS.crest.cy * canvasH;
  ctx.drawImage(crest, cx - w / 2, cy - h / 2, w, h);
}

function drawSponsorArc(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
  const cx = ANCHORS.gapCircle.cx * canvasW;
  const cy = ANCHORS.gapCircle.cy * canvasH;
  const radius = ANCHORS.gapCircle.radiusFrac * canvasW + canvasW * 0.018;
  const fontSize = Math.round(canvasW * 0.024);
  // Sweeps the left semicircle, bottom to top (matches the original print).
  drawArcText(
    ctx,
    "GESTIÓ AGRORAMADERA DE PONENT",
    cx,
    cy,
    radius,
    Math.PI * 0.62,
    Math.PI * 0.86,
    `700 ${fontSize}px Inter, system-ui, sans-serif`,
    "#ffffff"
  );
}

function drawBackText(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
  const hashSize = Math.round(ANCHORS.hashtag.heightFrac * canvasH);
  ctx.save();
  ctx.font = `800 ${hashSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = `${Math.round(hashSize * 0.04)}px`;
  ctx.fillText("#AIXÒ ÉS JUNEDA", ANCHORS.hashtag.cx * canvasW, ANCHORS.hashtag.cy * canvasH);
  ctx.restore();

  const sponsorSize = Math.round(ANCHORS.masiatero.heightFrac * canvasH);
  ctx.save();
  ctx.font = `600 italic ${sponsorSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("masiatero", ANCHORS.masiatero.cx * canvasW, ANCHORS.masiatero.cy * canvasH);
  ctx.restore();
}

function makeCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export interface KitTextureSet {
  front: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
  sleeveBadge: THREE.CanvasTexture;
  dispose: () => void;
}

export async function buildKitTextures(): Promise<KitTextureSet> {
  const [frontImg, backImg, crestImg] = await Promise.all([
    loadImage(FRONT_SRC),
    loadImage(BACK_SRC),
    loadImage(CREST_SRC),
  ]);

  // ── Front ──────────────────────────────────────────────────────────────
  const frontCanvas = document.createElement("canvas");
  frontCanvas.width = FRONT_W;
  frontCanvas.height = FRONT_H;
  const frontCtx = frontCanvas.getContext("2d")!;
  frontCtx.imageSmoothingEnabled = true;
  frontCtx.imageSmoothingQuality = "high";
  frontCtx.drawImage(frontImg, 0, 0, FRONT_W, FRONT_H);
  drawSponsorArc(frontCtx, FRONT_W, FRONT_H);
  drawCrest(frontCtx, crestImg, FRONT_W, FRONT_H);

  // ── Back (dorsal stays baked — see plan §1.3a) ──────────────────────────
  const backCanvas = document.createElement("canvas");
  backCanvas.width = BACK_W;
  backCanvas.height = BACK_H;
  const backCtx = backCanvas.getContext("2d")!;
  backCtx.imageSmoothingEnabled = true;
  backCtx.imageSmoothingQuality = "high";
  backCtx.drawImage(backImg, 0, 0, BACK_W, BACK_H);
  drawBackText(backCtx, BACK_W, BACK_H);

  // ── Sleeve badge (small crop, reused + mirrored on the opposite arm) ────
  const badgeCanvas = document.createElement("canvas");
  const badgeScale = 6; // source crop is tiny; upscale onto its own canvas
  badgeCanvas.width = SLEEVE_BADGE_CROP.width * badgeScale;
  badgeCanvas.height = SLEEVE_BADGE_CROP.height * badgeScale;
  const badgeCtx = badgeCanvas.getContext("2d")!;
  badgeCtx.imageSmoothingEnabled = true;
  badgeCtx.imageSmoothingQuality = "high";
  badgeCtx.drawImage(
    frontImg,
    SLEEVE_BADGE_CROP.left,
    SLEEVE_BADGE_CROP.top,
    SLEEVE_BADGE_CROP.width,
    SLEEVE_BADGE_CROP.height,
    0,
    0,
    badgeCanvas.width,
    badgeCanvas.height
  );

  const front = makeCanvasTexture(frontCanvas);
  const back = makeCanvasTexture(backCanvas);
  const sleeveBadge = makeCanvasTexture(badgeCanvas);

  return {
    front,
    back,
    sleeveBadge,
    dispose: () => {
      front.dispose();
      back.dispose();
      sleeveBadge.dispose();
    },
  };
}
