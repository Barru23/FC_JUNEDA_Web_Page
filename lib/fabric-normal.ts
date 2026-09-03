// lib/fabric-normal.ts
//
// Generates a small tileable jersey-knit normal map at runtime — no texture
// file to fetch. A height field of offset-row loops (the classic knit "V"
// pattern) is rendered to a canvas, then converted to a normal map with a
// Sobel gradient. This is what turns the flat MeshPhysicalMaterial into
// something that reads as woven cloth instead of painted plastic.

import * as THREE from "three";

const SIZE = 256;
const LOOP_SIZE = 10; // px per knit loop — tune against the shirt's world scale

function buildHeightField(): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Knit loops: each row of stitches offset by half a loop from the row
  // above, like real weft-knit fabric.
  for (let y = -LOOP_SIZE; y < SIZE + LOOP_SIZE; y += LOOP_SIZE) {
    const rowIndex = Math.round(y / LOOP_SIZE);
    const xOffset = (rowIndex % 2) * (LOOP_SIZE / 2);
    for (let x = -LOOP_SIZE; x < SIZE + LOOP_SIZE; x += LOOP_SIZE) {
      const cx = x + xOffset;
      const grad = ctx.createRadialGradient(cx, y, 0, cx, y, LOOP_SIZE * 0.62);
      grad.addColorStop(0, "#a8a8a8");
      grad.addColorStop(0.55, "#888888");
      grad.addColorStop(1, "#787878");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, y, LOOP_SIZE * 0.62, LOOP_SIZE * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const img = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const heights = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) heights[i] = img[i * 4] / 255;
  return heights;
}

function heightsToNormalMap(heights: Float32Array): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const out = ctx.createImageData(SIZE, SIZE);

  const at = (x: number, y: number) => heights[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];
  const strength = 2.2;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Sobel gradient, wrapped so the texture stays seamlessly tileable.
      const dx =
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) -
        (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy =
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) -
        (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));

      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      const i = (y * SIZE + x) * 4;
      out.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas;
}

export function buildFabricNormalMap(repeatX = 40, repeatY = 40): THREE.CanvasTexture {
  const canvas = heightsToNormalMap(buildHeightField());
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
  return texture;
}
