"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Center, Decal, Environment, Lightformer, ContactShadows, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MannequinBust } from "./kit/MannequinBust";
import { buildKitTextures, type KitTextureSet } from "@/lib/kit-texture";
import { buildFabricNormalMap } from "@/lib/fabric-normal";

const KIT_MODEL_PATH = "/models/kit-juneda.glb";

/* ─────────────────────────────────────────────
   Material names on the optimized GLB (see
   scripts/optimize-kit.mjs — Label_Body and
   Label_Neck were deduplicated into one material
   once their textures were stripped; the two
   Spain-logo quad primitives were deleted outright).
   ───────────────────────────────────────────── */
const MATERIAL_CONFIG: Record<string, { color: string; roughness: number }> = {
  "T-Shirt_Inside": { color: "#8b0000", roughness: 0.7 },
  Label_Body: { color: "#1a1a1a", roughness: 0.5 },
  "T-Shirt_Outside": { color: "#e10600", roughness: 0.45 },
  "Material.001": { color: "#0b2e83", roughness: 0.5 }, // seams/stitching
  "Material.002": { color: "#FBBF24", roughness: 0.4 }, // gold accent
};

const MODEL_SCALE = 5.5;

/* ─────────────────────────────────────────────
   TShirtModel — loads the de-Spained GLB, applies
   club-colour cloth materials, and projects the
   real kit artwork onto the fabric via Decals
   (planar projection needs no UV knowledge of the
   donor mesh — see plan §1.2).
   ───────────────────────────────────────────── */

function TShirtModel({ textures }: { textures: KitTextureSet }) {
  const { scene } = useGLTF(KIT_MODEL_PATH);
  const fabricNormal = useMemo(() => buildFabricNormalMap(48, 48), []);
  const meshRef = useRef<THREE.Mesh | null>(null);

  // Decal positions, resolved once the mesh's real matrixWorld (including
  // Center's re-centering and the donor GLB's -90° axis swap) has settled.
  // Decal's `position` prop is read in the TARGET MESH'S OWN LOCAL SPACE
  // (it zeroes the mesh's matrixWorld while computing the projection), so a
  // world-space-looking value like "just in front of the chest" has to be
  // converted through worldToLocal — hand-deriving that conversion by
  // reasoning about the quantization + rotation math is exactly the kind of
  // arithmetic that's easy to get subtly wrong, so three.js is asked to do
  // it instead of re-deriving the matrix by hand.
  const [decalLocalPos, setDecalLocalPos] = useState<{ front: THREE.Vector3; back: THREE.Vector3 } | null>(null);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // Checked against the ORIGINAL material names, before they're replaced
      // below — the replacement MeshPhysicalMaterial has no .name of its own,
      // so this check must not run after the swap.
      const isOutside = materials.some((m) => m.name === "T-Shirt_Outside");
      const newMaterials = materials.map((origMat) => {
        const config = MATERIAL_CONFIG[origMat.name];
        if (!config) return origMat;
        return new THREE.MeshPhysicalMaterial({
          name: origMat.name,
          color: config.color,
          roughness: config.roughness,
          metalness: 0.02,
          sheen: 0.4,
          sheenRoughness: 0.7,
          sheenColor: new THREE.Color(config.color).lerp(new THREE.Color("#ffffff"), 0.3),
          normalMap: origMat.name === "T-Shirt_Outside" || origMat.name === "T-Shirt_Inside" ? fabricNormal : undefined,
          normalScale: new THREE.Vector2(0.35, 0.35),
          side: THREE.DoubleSide,
        });
      });
      mesh.material = Array.isArray(mesh.material) ? newMaterials : newMaterials[0];
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (isOutside) meshRef.current = mesh;
    });
    return clone;
  }, [scene, fabricNormal]);

  // World-space half-extents of the finished scene (measured once with
  // gltf-transform's getBounds against the real dequantized geometry):
  // x:±1.444 width, y:±1.719 height, z:±0.693 depth, after Center + the
  // 5.5x MODEL_SCALE below.
  const frontWorldZ = 0.126 * MODEL_SCALE + 0.02; // just outside the front surface
  const chestWorldY = 0.25; // a bit above vertical center — chest height

  // Runs every frame but only does work once: waits for Center's layout
  // effect (and the mesh's own matrixWorld) to settle, then resolves the
  // world-space anchors above into the mesh's local space exactly once.
  //
  // KNOWN UNRESOLVED BUG (left mid-debug when this component was shelved in
  // favour of the static studio-photo viewer — see KitViewer2D.tsx): even
  // after fixing (1) the material-name check running after the material
  // swap that erased it, and (2) this worldToLocal conversion replacing a
  // hand-derived world-space guess, the resulting Decal still resolves to
  // 0 vertices — `d.geometry.attributes.position.count === 0` — meaning
  // `front`/`back` still aren't landing on the mesh surface. The likely
  // remaining suspect is ancestor-matrix staleness on the first frame this
  // runs (Center's own layout effect vs. this useFrame callback's ordering),
  // not yet confirmed. Next step if this is revisited: log the full
  // ancestor chain (mesh -> ... -> scene root), each node's decomposed
  // position/quaternion/scale, and compare against the expected -90° donor
  // rotation + Center's shift before trusting worldToLocal's output.
  useFrame((state) => {
    if (decalLocalPos || !meshRef.current) return;
    const mesh = meshRef.current;
    // Update from the scene ROOT, not just the mesh — updateMatrixWorld on a
    // single node reuses whatever its parent chain last computed, which can
    // be stale (still identity/pre-Center) on the very first frame.
    state.scene.updateMatrixWorld(true);

    const front = mesh.worldToLocal(new THREE.Vector3(0, chestWorldY, frontWorldZ));
    const back = mesh.worldToLocal(new THREE.Vector3(0, chestWorldY, -frontWorldZ));
    setDecalLocalPos({ front, back });
  });

  return (
    <Center>
      <primitive object={clonedScene} scale={[MODEL_SCALE, MODEL_SCALE, MODEL_SCALE]} />
      {decalLocalPos && meshRef.current && (
        <>
          {/* rotation as a bare number (rather than an Euler array) makes
              Decal auto-orient to the mesh's own local surface normal at
              `position` — the only reliable way to aim it correctly given
              the local/world axis swap from the donor GLB's -90° rotation. */}
          <Decal
            mesh={meshRef as React.RefObject<THREE.Mesh>}
            position={decalLocalPos.front}
            rotation={0}
            scale={[1.0, 0.7, 0.4]}
            map={textures.front}
          />
          <Decal
            mesh={meshRef as React.RefObject<THREE.Mesh>}
            position={decalLocalPos.back}
            rotation={0}
            scale={[1.0, 0.7, 0.4]}
            map={textures.back}
          />
          {/* Sleeve emblem: disabled for now — needs its own properly
              measured local-space anchor before re-enabling; the earlier
              attempt (a world-space guess at the torso's widest point)
              overshot the actual sleeve surface and projected across a
              huge, badly distorted area. textures.sleeveBadge is still
              built and ready for that follow-up. */}
        </>
      )}
    </Center>
  );
}

useGLTF.preload(KIT_MODEL_PATH);

/* ─────────────────────────────────────────────
   Turntable — drag-to-rotate the garment itself
   (not the camera), so idle auto-spin and manual
   drag never fight over who owns the camera.
   ───────────────────────────────────────────── */

interface TurntableState {
  current: number;
  target: number;
  dragging: boolean;
  idleSince: number;
}

function Turntable({ state, children }: { state: React.MutableRefObject<TurntableState>; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const s = state.current;
    const now = performance.now();

    if (!s.dragging && now - s.idleSince > 2000) {
      s.target += delta * 0.18; // slow idle turntable
    }

    s.current = THREE.MathUtils.damp(s.current, s.target, 4, delta);
    if (group.current) group.current.rotation.y = s.current;
  });

  return <group ref={group}>{children}</group>;
}

/* ─────────────────────────────────────────────
   Studio lighting rig — Lightformers instead of
   an HDRI preset, so no CDN fetch is triggered.
   ───────────────────────────────────────────── */

function StudioLighting() {
  return (
    <Environment resolution={256}>
      <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[3, 3, 4]} scale={[3, 3, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1} color="#ffe8d6" position={[-4, 1, -3]} scale={[2.5, 2.5, 1]} target={[0, 0, 0]} />
      <Lightformer form="ring" intensity={1.4} color="#ffffff" position={[0, 4, 0]} scale={[4, 4, 1]} target={[0, 0, 0]} />
    </Environment>
  );
}

/* ─────────────────────────────────────────────
   Scene — everything inside the Canvas.
   ───────────────────────────────────────────── */

interface SceneProps {
  textures: KitTextureSet;
  turntable: React.MutableRefObject<TurntableState>;
}

function Scene({ textures, turntable }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={1.8} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-3, 4, -5]} intensity={0.9} />
      <pointLight position={[0, -3, 0]} intensity={0.25} color="#e10600" />

      <StudioLighting />

      <Turntable state={turntable}>
        <MannequinBust />
        <Suspense fallback={null}>
          <TShirtModel textures={textures} />
        </Suspense>
      </Turntable>

      <ContactShadows position={[0, -1.7, 0]} opacity={0.45} scale={8} blur={2.2} far={2} />
    </>
  );
}

/* ─────────────────────────────────────────────
   ZoomOnlyControls — dolly in/out without ever
   touching rotation (the Turntable owns that).
   ───────────────────────────────────────────── */

function ZoomOnlyControls() {
  const { camera, gl } = useThree();
  const distance = useRef<number | null>(null);
  const MIN = 3.2; // never let zoom outrun the print's source resolution
  const MAX = 7;

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (distance.current === null) distance.current = camera.position.length();
      distance.current = THREE.MathUtils.clamp(distance.current + e.deltaY * 0.0025, MIN, MAX);
      const dir = camera.position.clone().normalize();
      camera.position.copy(dir.multiplyScalar(distance.current));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [camera, gl]);

  return null;
}

/* ─────────────────────────────────────────────
   KitViewer3D — exported wrapper. Gates the whole
   WebGL scene behind an IntersectionObserver (no
   bytes fetched until the shop section is close to
   the viewport) and turns pointer drags into
   turntable rotation.
   ───────────────────────────────────────────── */

const VIEW_ANGLES: Record<string, number> = {
  front: 0,
  back: Math.PI,
  left: Math.PI / 2,
  right: -Math.PI / 2,
};

interface KitViewer3DProps {
  view: "front" | "back" | "left" | "right";
}

export function KitViewer3D({ view }: KitViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [textures, setTextures] = useState<KitTextureSet | null>(null);

  const turntable = useRef<TurntableState>({ current: 0, target: 0, dragging: false, idleSince: performance.now() });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true);
          useGLTF.preload(KIT_MODEL_PATH);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || textures) return;
    let cancelled = false;
    buildKitTextures().then((t) => {
      if (!cancelled) setTextures(t);
    });
    return () => {
      cancelled = true;
    };
  }, [isVisible, textures]);

  useEffect(() => {
    turntable.current.target = VIEW_ANGLES[view] ?? 0;
    turntable.current.idleSince = performance.now();
  }, [view]);

  // Dispose whichever texture set was most recently built, on unmount only —
  // a ref (not the `textures` closure) so this doesn't fire the moment
  // textures first arrive (state going null -> set).
  const latestTextures = useRef<KitTextureSet | null>(null);
  useEffect(() => {
    latestTextures.current = textures;
  }, [textures]);
  useEffect(() => {
    return () => latestTextures.current?.dispose();
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    turntable.current.dragging = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!turntable.current.dragging) return;
    turntable.current.target += e.movementX * 0.008;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    turntable.current.dragging = false;
    turntable.current.idleSince = performance.now();
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      ref={containerRef}
      className="relative h-[450px] w-full touch-none overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-sm sm:h-[550px]"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {isVisible && textures ? (
        <Canvas camera={{ position: [0, 0.35, 4.8], fov: 50 }} shadows dpr={[1, 1.75]}>
          <Scene textures={textures} turntable={turntable} />
          <ZoomOnlyControls />
        </Canvas>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <span className="font-display text-sm font-semibold uppercase tracking-wider text-white/60">
            Carregant model 3D...
          </span>
        </div>
      )}

      <div className="absolute bottom-4 left-4 flex gap-1.5 rounded-lg border border-white/5 bg-black/50 p-1 backdrop-blur-md">
        <span className="flex items-center px-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
          GIR 360°
        </span>
      </div>
    </div>
  );
}
