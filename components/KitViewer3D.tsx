"use client";

import React, { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Center, useGLTF, Environment, Text } from "@react-three/drei";
import * as THREE from "three";

/* ─────────────────────────────────────────────
   Material names from the GLB (inspect-glb.mjs):

   Prim[0]  "T-Shirt_Inside"    — inner fabric
   Prim[1]  "Label_Body"        — body label
   Prim[2]  "Label_Neck"        — neck label
   Prim[3]  "T-Shirt_Outside"   — ★ main outer surface
   Prim[4]  "Material.001"      — stitching / seams (dark)
   Prim[5]  "Material.002"      — gold accent
   Prim[6]  "Empty"             — logo quad (PNG overlay)
   Prim[7]  "Empty.002"         — federation logo quad
   ───────────────────────────────────────────── */

const MATERIAL_CONFIG: Record<string, { color: string; roughness: number; visible?: boolean }> = {
  "T-Shirt_Inside":  { color: "#8b0000", roughness: 0.7 },           // dark red inside
  "Label_Body":      { color: "#1a1a1a", roughness: 0.5 },           // dark label
  "Label_Neck":      { color: "#1a1a1a", roughness: 0.5 },           // dark neck label
  "T-Shirt_Outside": { color: "#e10600", roughness: 0.45 },          // ★ CF Juneda RED
  "Material.001":    { color: "#0b2e83", roughness: 0.5 },           // blue seams/stitching
  "Material.002":    { color: "#FBBF24", roughness: 0.4 },           // gold accent
  "Empty":           { color: "#ffffff", roughness: 0.5, visible: false },  // hide original logos
  "Empty.002":       { color: "#ffffff", roughness: 0.5, visible: false },  // hide original logos
};

/* ─────────────────────────────────────────────
   Camera Controller – smooth animated orbit
   ───────────────────────────────────────────── */

function CameraController({ view }: { view: "front" | "back" | "left" | "right" }) {
  const { camera } = useThree();
  const targetAngle = useRef(0);

  useEffect(() => {
    switch (view) {
      case "front":  targetAngle.current = 0; break;
      case "back":   targetAngle.current = Math.PI; break;
      case "left":   targetAngle.current = -Math.PI / 2; break;
      case "right":  targetAngle.current = Math.PI / 2; break;
    }
  }, [view]);

  useFrame(() => {
    const radius = 3.8;
    const currentAngle = Math.atan2(camera.position.x, camera.position.z);
    let diff = targetAngle.current - currentAngle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));

    const newAngle = currentAngle + diff * 0.07;

    camera.position.x = radius * Math.sin(newAngle);
    camera.position.z = radius * Math.cos(newAngle);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 0.6, 0.06);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ─────────────────────────────────────────────
   TShirtModel – loads GLB & applies CF Juneda
   colours via per-material solid colors +
   3D Text overlays for sponsors & dorsal
   ───────────────────────────────────────────── */

interface TShirtModelProps {
  name: string;
  number: string;
  customize: boolean;
}

function TShirtModel({ name, number, customize }: TShirtModelProps) {
  const { scene } = useGLTF("/models/tshirt.glb");

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      // Handle multi-material meshes (primitives become groups with child meshes)
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((origMat) => {
        const config = MATERIAL_CONFIG[origMat.name];
        if (config) {
          if (config.visible === false) {
            mesh.visible = false;
            return;
          }
          const newMat = new THREE.MeshStandardMaterial({
            color: config.color,
            roughness: config.roughness,
            metalness: 0.02,
            side: THREE.DoubleSide,
          });
          mesh.material = newMat;
        }
      });

      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    return clone;
  }, [scene]);

  // The model bbox is ~0.52 x 0.25 x 0.62 (very small).
  // Scale up to fill the viewport. Target ~3 world units on largest axis.
  const MODEL_SCALE = 5.5;

  const displayName = customize && name ? name.toUpperCase() : "BARRU";
  const displayNumber = customize && number ? number : "10";

  // Text Z offsets: model depth ≈ 0.62 * scale / 2 = front surface Z
  // The model center is roughly at origin after <Center>, with front facing +Z
  // (the root node has a -90° X rotation from Blender export)
  const frontZ = 0.62 * MODEL_SCALE * 0.5 + 0.04;
  const backZ = frontZ; // same magnitude, used in the rotated back group

  return (
    <group>
      <Center>
        <primitive object={clonedScene} scale={[MODEL_SCALE, MODEL_SCALE, MODEL_SCALE]} />
      </Center>

      {/* ═══════════════════════════════════
          FRONT TEXT — sponsor "gap"
          ═══════════════════════════════════ */}
      <Text
        position={[0, -0.05, frontZ]}
        fontSize={0.32}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#cc0000"
      >
        gap
      </Text>
      <Text
        position={[0, -0.28, frontZ]}
        fontSize={0.065}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}
      >
        GESTIÓ AGRORAMADERA DE PONENT
      </Text>

      {/* ═══════════════════════════════════
          BACK TEXT — rotated 180° Y so text
          faces outward from the back
          ═══════════════════════════════════ */}
      <group rotation={[0, Math.PI, 0]}>
        {/* #AIXÒ ÉS JUNEDA */}
        <Text
          position={[0, 0.55, backZ]}
          fontSize={0.085}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
        >
          #AIXÒ ÉS JUNEDA
        </Text>

        {/* Player name */}
        <Text
          position={[0, 0.30, backZ]}
          fontSize={0.18}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.004}
          outlineColor="#990000"
        >
          {displayName}
        </Text>

        {/* Player number — large */}
        <Text
          position={[0, -0.2, backZ]}
          fontSize={0.65}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#990000"
        >
          {displayNumber}
        </Text>

        {/* Sponsor "masiatero" */}
        <Text
          position={[0, -0.65, backZ]}
          fontSize={0.1}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.03}
          fontStyle="italic"
        >
          masiatero
        </Text>
      </group>

      {/* ═══════════════════════════════════
          SLEEVE TEXT — ESGIR / Juneda
          ═══════════════════════════════════ */}
      {/* Right sleeve */}
      <group position={[1.3, 0.15, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <Text fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle">
          ESGIR
        </Text>
        <Text position={[0, -0.12, 0]} fontSize={0.07} color="#ffffff" anchorX="center" anchorY="middle">
          Juneda
        </Text>
      </group>

      {/* Left sleeve */}
      <group position={[-1.3, 0.15, 0]} rotation={[0, Math.PI / 2, 0]}>
        <Text fontSize={0.12} color="#ffffff" anchorX="center" anchorY="middle">
          ESGIR
        </Text>
        <Text position={[0, -0.12, 0]} fontSize={0.07} color="#ffffff" anchorX="center" anchorY="middle">
          Juneda
        </Text>
      </group>
    </group>
  );
}

// Preload the GLB so it starts downloading early
useGLTF.preload("/models/tshirt.glb");

/* ─────────────────────────────────────────────
   KitViewer3D – exported wrapper component
   (same props interface for ShopSection)
   ───────────────────────────────────────────── */

interface KitViewer3DProps {
  view: "front" | "back" | "left" | "right";
  name: string;
  number: string;
  customize: boolean;
}

export function KitViewer3D({ view, name, number, customize }: KitViewer3DProps) {
  return (
    <div className="relative h-[450px] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm sm:h-[550px]">
      <Suspense
        fallback={
          <div className="flex h-full w-full flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
            <span className="font-display text-sm font-semibold uppercase tracking-wider text-white/60">
              Carregant model 3D...
            </span>
          </div>
        }
      >
        <Canvas camera={{ position: [0, 0.6, 3.8], fov: 50 }} shadows>
          {/* Studio lighting */}
          <ambientLight intensity={0.8} />
          <directionalLight
            position={[4, 6, 5]}
            intensity={2.5}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-3, 4, -5]} intensity={1.5} />
          <pointLight position={[0, -3, 0]} intensity={0.3} color="#e10600" />

          {/* Environment for subtle reflections */}
          <Environment preset="city" />

          <TShirtModel name={name} number={number} customize={customize} />
          <CameraController view={view} />

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={2.0}
            maxDistance={6.0}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.6}
          />
        </Canvas>
      </Suspense>

      <div className="absolute bottom-4 left-4 flex gap-1.5 rounded-lg border border-white/5 bg-black/50 p-1 backdrop-blur-md">
        <span className="flex items-center px-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
          GIR 360°
        </span>
      </div>
    </div>
  );
}
