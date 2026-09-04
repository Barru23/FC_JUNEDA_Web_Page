// lib/cromo-texture.ts
//
// Textures for the roster's player/staff cards. The card FACE is no longer
// canvas-drawn — the club's own designed cromos (public/cromos/<slug>.webp,
// built by scripts/build-cromos.mjs from the source posters) are loaded as
// plain image textures. Only the shared "at rest" crest face is still
// painted procedurally, since every card shows the same one and it doubles
// as the crest-reveal effect (see CromoMesh.tsx).

import * as THREE from "three";

const CREST_SRC = "/data/Logo_cutout.png";

// Matches the cromo crop's aspect ratio (512x698, see build-cromos.mjs) so
// the crest face and the photo face sit on the same plane geometry.
const CARD_W = 512;
const CARD_H = 698;

let crestImagePromise: Promise<HTMLImageElement> | null = null;
function loadCrestImage(): Promise<HTMLImageElement> {
  if (!crestImagePromise) {
    crestImagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = CREST_SRC;
    });
  }
  return crestImagePromise;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** Shared "at rest" face — the club crest, identical for every card. Painted
 *  in the club's own navy/red rather than a neutral dark grey, so the
 *  crossfade into the real (bright, white-backed) cromo isn't a jump from
 *  a foreign palette into the club's. */
export async function buildCrestTexture(): Promise<THREE.CanvasTexture> {
  const crest = await loadCrestImage();
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;

  const r = 26; // matches CORNER_RADIUS_RATIO in build-cromos.mjs at this size
  roundRectPath(ctx, 0, 0, CARD_W, CARD_H, r);
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, "#0d2657");
  bg.addColorStop(0.55, "#081b40");
  bg.addColorStop(1, "#050f26");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Top sheen, matching the card face's own glossy highlight.
  const sheen = ctx.createLinearGradient(0, 0, 0, CARD_H * 0.29);
  sheen.addColorStop(0, "rgba(255,255,255,0.12)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, CARD_W, CARD_H * 0.29);

  // Thin red filet just inside the border, echoing the cromo's own frame.
  ctx.strokeStyle = "rgba(225,6,0,0.55)";
  ctx.lineWidth = 3;
  roundRectPath(ctx, 6, 6, CARD_W - 12, CARD_H - 12, r - 4);
  ctx.stroke();

  const crestAspect = crest.width / crest.height;
  const crestH = CARD_H * 0.42;
  const crestW = crestH * crestAspect;
  ctx.drawImage(crest, (CARD_W - crestW) / 2, CARD_H * 0.28, crestW, crestH);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  ctx.fillText("CF JUNEDA", CARD_W / 2, CARD_H * 0.85);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "600 15px Inter, system-ui, sans-serif";
  ctx.fillText("TEMPORADA 26/27", CARD_W / 2, CARD_H * 0.885);

  return makeTexture(canvas);
}

// Per-URL cache — a substitute card genuinely unmounts/remounts as a
// formation row collapses and re-expands, and the crossfade briefly holds
// both the crest and the photo face mounted at once, so without a shared
// cache the same cromo image would be re-decoded every time.
const textureCache = new Map<string, Promise<THREE.Texture>>();

/** Loads one of the club's own cromo images (public/cromos/*.webp) as a
 *  plain, ready-composited texture — no canvas drawing, the card design
 *  (frame, crest, name, stats) is already baked into the PNG/WebP itself. */
export function loadCromoTexture(url: string): Promise<THREE.Texture> {
  let cached = textureCache.get(url);
  if (!cached) {
    cached = new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          texture.needsUpdate = true;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
    textureCache.set(url, cached);
  }
  return cached;
}

export const CARD_ASPECT = CARD_W / CARD_H;
