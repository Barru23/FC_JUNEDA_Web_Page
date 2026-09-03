// lib/cromo-texture.ts
//
// Canvas-drawn textures for the roster's player/staff cards. Replaces the
// DOM-rendered card markup that used to live inside a drei <Html transform>
// per card (see components/roster/PlayerCromo.tsx / StaffBench.tsx history) —
// three states per card (crest / front / back) are baked into three
// CanvasTexture instances instead, applied to real meshes.
//
// The crest image is shared by every card at rest, so it's loaded once and
// cached module-wide rather than once per card.

import * as THREE from "three";

const CREST_SRC = "/data/Logo_cutout.png";

// Canvas is 4x the DOM card's 124x166 px for retina sharpness.
const CARD_W = 496;
const CARD_H = 664;

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

function paintCardBase(ctx: CanvasRenderingContext2D) {
  const r = 28;
  roundRectPath(ctx, 0, 0, CARD_W, CARD_H, r);
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, "#1c1d22");
  bg.addColorStop(0.5, "#131418");
  bg.addColorStop(1, "#0b0c0e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Top sheen, matching the old DOM card's white-to-transparent strip.
  const sheen = ctx.createLinearGradient(0, 0, 0, CARD_H * 0.29);
  sheen.addColorStop(0, "rgba(255,255,255,0.1)");
  sheen.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, CARD_W, CARD_H * 0.29);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** Shared "at rest" face — the club crest, identical for every card. */
export async function buildCrestTexture(): Promise<THREE.CanvasTexture> {
  const crest = await loadCrestImage();
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  paintCardBase(ctx);

  const crestAspect = crest.width / crest.height;
  const crestH = CARD_H * 0.42;
  const crestW = crestH * crestAspect;
  ctx.drawImage(crest, (CARD_W - crestW) / 2, CARD_H * 0.28, crestW, crestH);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "700 22px Inter, system-ui, sans-serif";
  ctx.fillText("CF JUNEDA", CARD_W / 2, CARD_H * 0.85);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "600 15px Inter, system-ui, sans-serif";
  ctx.fillText("TEMPORADA 25/26", CARD_W / 2, CARD_H * 0.885);

  return makeTexture(canvas);
}

export interface CromoFrontData {
  number: number | string;
  badgeLabel: string; // "11" starter / "SUPL" / a staff role abbreviation
  initials: string;
  name: string;
  subtitle: string; // role || position, or staff role
  positionBadge?: string; // small corner letter on the avatar (players only)
  rarityColor: string;
  /** Real photo, once SquadPlayer.photo/StaffMember.photo is populated — the
   *  caller loads the Image (async) and passes it in; drawn clipped into the
   *  avatar circle in place of the initials. Null/undefined falls back to
   *  initials, so this needs no further code change whenever photos land. */
  photoImage?: HTMLImageElement | null;
}

export function buildFrontTexture(data: CromoFrontData): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  paintCardBase(ctx);

  const pad = 34;

  // Header: dorsal (faint, large) + badge pill
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.font = "900 64px Inter, system-ui, sans-serif";
  ctx.fillText(String(data.number), pad, 96);

  const badgeText = data.badgeLabel;
  ctx.font = "700 20px Inter, system-ui, sans-serif";
  const badgeW = ctx.measureText(badgeText).width + 36;
  const badgeH = 40;
  const badgeX = CARD_W - pad - badgeW;
  const badgeY = 48;
  ctx.fillStyle = "rgba(225,6,0,0.15)";
  roundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(225,6,0,0.4)";
  ctx.lineWidth = 2;
  roundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.stroke();
  ctx.fillStyle = "#ff9a8f";
  ctx.textAlign = "center";
  ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + 27);

  // Avatar
  const avatarR = 88;
  const avatarCx = CARD_W / 2;
  const avatarCy = CARD_H * 0.42;
  const avatarGrad = ctx.createLinearGradient(
    avatarCx - avatarR, avatarCy - avatarR,
    avatarCx + avatarR, avatarCy + avatarR
  );
  avatarGrad.addColorStop(0, "rgba(225,6,0,0.35)");
  avatarGrad.addColorStop(0.5, "rgba(30,58,138,0.35)");
  avatarGrad.addColorStop(1, "rgba(0,0,0,1)");
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
  ctx.fillStyle = avatarGrad;
  ctx.fill();

  if (data.photoImage) {
    // Real photo, clipped to the same circle, cover-fit.
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
    ctx.clip();
    const img = data.photoImage;
    const scale = Math.max((avatarR * 2) / img.width, (avatarR * 2) / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, avatarCx - w / 2, avatarCy - h / 2, w, h);
    ctx.restore();
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 46px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(data.initials, avatarCx, avatarCy + 4);
    ctx.textBaseline = "alphabetic";
  }

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
  ctx.stroke();

  if (data.positionBadge) {
    const bR = 22;
    const bCx = avatarCx + avatarR * 0.72;
    const bCy = avatarCy + avatarR * 0.72;
    ctx.beginPath();
    ctx.arc(bCx, bCy, bR, 0, Math.PI * 2);
    ctx.fillStyle = data.rarityColor;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 20px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(data.positionBadge, bCx, bCy + 2);
    ctx.textBaseline = "alphabetic";
  }

  // Name + subtitle
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 34px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(data.name, CARD_W / 2, CARD_H * 0.66, CARD_W - pad * 2);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "700 20px Inter, system-ui, sans-serif";
  ctx.fillText(data.subtitle.toUpperCase(), CARD_W / 2, CARD_H * 0.7, CARD_W - pad * 2);

  // Footer
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, CARD_H - 56);
  ctx.lineTo(CARD_W - pad, CARD_H - 56);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "800 18px Inter, system-ui, sans-serif";
  ctx.fillText("CF JUNEDA", pad, CARD_H - 26);
  ctx.textAlign = "right";
  ctx.fillStyle = data.rarityColor;
  ctx.fillText("25/26", CARD_W - pad, CARD_H - 26);

  return makeTexture(canvas);
}

export interface CromoBackData {
  number: number | string;
  headerRight: string; // position or role
  name: string;
  bio: string;
  rarityColor: string;
}

export function buildBackTexture(data: CromoBackData): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;
  paintCardBase(ctx);

  const pad = 34;

  ctx.strokeStyle = "rgba(225,6,0,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, 108);
  ctx.lineTo(CARD_W - pad, 108);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#ff5a4a";
  ctx.font = "800 42px Inter, system-ui, sans-serif";
  ctx.fillText(`#${data.number}`, pad, 88);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "700 20px Inter, system-ui, sans-serif";
  ctx.fillText(data.headerRight.toUpperCase(), CARD_W - pad, 88);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 34px Inter, system-ui, sans-serif";
  ctx.fillText(data.name, pad, 160, CARD_W - pad * 2);

  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "500 22px Inter, system-ui, sans-serif";
  const lines = wrapText(ctx, data.bio, CARD_W - pad * 2).slice(0, 6);
  lines.forEach((line, i) => ctx.fillText(line, pad, 210 + i * 32));

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  roundRectPath(ctx, pad, CARD_H - 110, CARD_W - pad * 2, 60, 16);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "600 18px Inter, system-ui, sans-serif";
  ctx.fillText("Clica per tornar", CARD_W / 2, CARD_H - 74);

  return makeTexture(canvas);
}

export const CARD_ASPECT = CARD_W / CARD_H;
