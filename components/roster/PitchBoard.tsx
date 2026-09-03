"use client";

import React, { useEffect, useMemo } from "react";
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
  texture.anisotropy = 8;
  return texture;
}

export function PitchBoard() {
  const grassTexture = useMemo(() => createPitchTexture(), []);

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
      roughness: 0.7,
      metalness: 0.02,
    });

    // Ordre per a BoxGeometry: +X, -X, +Y (gespa), -Y (fons), +Z, -Z
    return [sideMat, sideMat, grassMat, bottomMat, sideMat, sideMat];
  }, [grassTexture]);

  // The canvas-generated grass texture (~6MB uncompressed on the GPU) and its
  // materials are recreated only when this board mounts, but three.js never
  // frees GPU resources on its own — dispose them if the board is ever
  // unmounted (e.g. a route change), or they leak for the life of the page.
  useEffect(() => {
    return () => {
      grassTexture?.dispose();
      materials.forEach((m) => m.dispose());
    };
  }, [grassTexture, materials]);

  return (
    <group position={[0, 0, 0]}>
      {/* Camp com a diorama 3D */}
      <mesh material={materials} position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[12, 0.4, 18]} />
      </mesh>

      {/* Vora subtil de resplendor vermell Juneda al peu del camp */}
      <mesh position={[0, -0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12.4, 18.4]} />
        <meshBasicMaterial color="#e10600" transparent opacity={0.06} />
      </mesh>
    </group>
  );
}
