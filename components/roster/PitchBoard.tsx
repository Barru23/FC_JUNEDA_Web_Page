"use client";

import React, { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Genera una textura procedural de gespa amb les línies reglamentàries del camp de futbol
 */
function createPitchTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1536; // Proporció 2:3 coherent amb 12x18
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // 1. Fons verd gespa
  ctx.fillStyle = "#2d8a4e";
  ctx.fillRect(0, 0, 1024, 1536);

  // 2. Franges de gespa alternades (mowing stripes horitzontals)
  ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
  const numStripes = 18;
  const stripeH = 1536 / numStripes;
  for (let i = 0; i < numStripes; i += 2) {
    ctx.fillRect(0, i * stripeH, 1024, stripeH);
  }

  // 3. Línies reglamentàries del camp
  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const margin = 50;
  const w = 1024 - margin * 2;
  const h = 1536 - margin * 2;

  // Perímetre exterior
  ctx.strokeRect(margin, margin, w, h);

  // Línia de mig camp
  const centerY = 1536 / 2;
  ctx.beginPath();
  ctx.moveTo(margin, centerY);
  ctx.lineTo(1024 - margin, centerY);
  ctx.stroke();

  // Cercle central (radi ~90px)
  ctx.beginPath();
  ctx.arc(512, centerY, 90, 0, Math.PI * 2);
  ctx.stroke();

  // Punt central
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(512, centerY, 5, 0, Math.PI * 2);
  ctx.fill();

  // ── Porteria Superior (Davanters) ──
  const penaltyW = 420;
  const penaltyH = 170;
  const goalW = 200;
  const goalH = 65;

  // Àrea gran superior
  ctx.strokeRect((1024 - penaltyW) / 2, margin, penaltyW, penaltyH);
  // Àrea petita superior
  ctx.strokeRect((1024 - goalW) / 2, margin, goalW, goalH);
  // Punt de penal superior
  ctx.beginPath();
  ctx.arc(512, margin + 120, 4, 0, Math.PI * 2);
  ctx.fill();
  // Arc d'àrea superior
  ctx.beginPath();
  ctx.arc(512, margin + 120, 65, 0.65, Math.PI - 0.65);
  ctx.stroke();

  // ── Porteria Inferior (Porter) ──
  // Àrea gran inferior
  ctx.strokeRect((1024 - penaltyW) / 2, 1536 - margin - penaltyH, penaltyW, penaltyH);
  // Àrea petita inferior
  ctx.strokeRect((1024 - goalW) / 2, 1536 - margin - goalH, goalW, goalH);
  // Punt de penal inferior
  ctx.beginPath();
  ctx.arc(512, 1536 - margin - 120, 4, 0, Math.PI * 2);
  ctx.fill();
  // Arc d'àrea inferior
  ctx.beginPath();
  ctx.arc(512, 1536 - margin - 120, 65, Math.PI + 0.65, 2 * Math.PI - 0.65);
  ctx.stroke();

  // Arcs de córner
  const cornerR = 24;
  // Córner dalt-esquerra
  ctx.beginPath();
  ctx.arc(margin, margin, cornerR, 0, Math.PI / 2);
  ctx.stroke();
  // Córner dalt-dreta
  ctx.beginPath();
  ctx.arc(1024 - margin, margin, cornerR, Math.PI / 2, Math.PI);
  ctx.stroke();
  // Córner baix-dreta
  ctx.beginPath();
  ctx.arc(1024 - margin, 1536 - margin, cornerR, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  // Córner baix-esquerra
  ctx.beginPath();
  ctx.arc(margin, 1536 - margin, cornerR, Math.PI * 1.5, Math.PI * 2);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // anisotropy is capped to the device's real max in PitchBoard(), below.
  return texture;
}

/**
 * Tileable blade-of-grass normal map — a height field of short vertical
 * streaks (random length/offset, like mown blades) run through a Sobel
 * gradient, the same technique lib/fabric-normal.ts uses for the shirt's
 * knit weave. Without this the turf reads as flat painted colour no matter
 * how good the marking artwork is.
 */
function createGrassNormalMap(): THREE.CanvasTexture {
  const size = 256;
  const heightCanvas = document.createElement("canvas");
  heightCanvas.width = size;
  heightCanvas.height = size;
  const hctx = heightCanvas.getContext("2d")!;
  hctx.fillStyle = "#808080";
  hctx.fillRect(0, 0, size, size);

  // Short randomized vertical blade streaks.
  const bladeCount = 900;
  for (let i = 0; i < bladeCount; i++) {
    const x = Math.random() * size;
    const yStart = Math.random() * size;
    const len = 4 + Math.random() * 8;
    const shade = 110 + Math.random() * 60;
    hctx.strokeStyle = `rgb(${shade},${shade},${shade})`;
    hctx.lineWidth = 1;
    hctx.beginPath();
    hctx.moveTo(x, yStart);
    hctx.lineTo(x + (Math.random() - 0.5) * 2, yStart + len);
    hctx.stroke();
  }

  const heights = hctx.getImageData(0, 0, size, size).data;
  const at = (x: number, y: number) => heights[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;

  const out = hctx.createImageData(size, size);
  const strength = 1.6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      const nx = -dx * strength;
      const ny = -dy * strength;
      const nz = 1;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const i = (y * size + x) * 4;
      out.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }

  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = size;
  normalCanvas.height = size;
  normalCanvas.getContext("2d")!.putImageData(out, 0, 0);

  const texture = new THREE.CanvasTexture(normalCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 36); // matches the board's 12x18 aspect
  texture.needsUpdate = true;
  return texture;
}

export function PitchBoard() {
  const { gl } = useThree();
  const grassTexture = useMemo(() => createPitchTexture(), []);
  const grassNormal = useMemo(() => (typeof document === "undefined" ? null : createGrassNormalMap()), []);

  // Cap to the device's real max rather than assuming every GPU supports 8x.
  useEffect(() => {
    const maxAniso = gl.capabilities.getMaxAnisotropy();
    if (grassTexture) grassTexture.anisotropy = Math.min(8, maxAniso);
    if (grassNormal) grassNormal.anisotropy = Math.min(4, maxAniso);
  }, [gl, grassTexture, grassNormal]);

  const materials = useMemo(() => {
    const sideMat = new THREE.MeshStandardMaterial({
      color: "#1f242d",
      roughness: 0.85,
      metalness: 0.05,
    });
    const bottomMat = new THREE.MeshStandardMaterial({
      color: "#111318",
      roughness: 0.95,
      metalness: 0.0,
    });
    const grassMat = new THREE.MeshStandardMaterial({
      color: grassTexture ? "#ffffff" : "#2d8a4e",
      map: grassTexture,
      normalMap: grassNormal ?? undefined,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 0.85,
      metalness: 0.0,
    });

    // Ordre per a BoxGeometry: +X, -X, +Y (gespa), -Y (fons), +Z, -Z
    return [sideMat, sideMat, grassMat, bottomMat, sideMat, sideMat];
  }, [grassTexture, grassNormal]);

  // The canvas-generated grass texture (~6MB uncompressed on the GPU) and its
  // materials are recreated only when this board mounts, but three.js never
  // frees GPU resources on its own — dispose them if the board is ever
  // unmounted (e.g. a route change), or they leak for the life of the page.
  useEffect(() => {
    return () => {
      grassTexture?.dispose();
      grassNormal?.dispose();
      materials.forEach((m) => m.dispose());
    };
  }, [grassTexture, grassNormal, materials]);

  return (
    <group position={[0, 0, 0]}>
      {/* Camp com a diorama 3D */}
      <mesh material={materials} position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[12, 0.4, 18]} />
      </mesh>

      {/* Vora de resplendor vermell Juneda — brightness (not opacity) does the
          work now, with toneMapped=false so the bloom pass in PitchScene.tsx
          actually sees it as bright rather than a clamped, tone-mapped dark red. */}
      <mesh position={[0, -0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12.4, 18.4]} />
        <meshBasicMaterial color="#ff1a0a" transparent opacity={0.35} toneMapped={false} />
      </mesh>
    </group>
  );
}
