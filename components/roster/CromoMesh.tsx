"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import { HoloMaterial } from "./HoloMaterial";
import { buildCrestTexture, loadCromoTexture, CARD_ASPECT } from "@/lib/cromo-texture";

// Shared across every card — loaded once, not once per card.
let sharedCrestTexture: THREE.CanvasTexture | null = null;
let sharedCrestPromise: Promise<THREE.CanvasTexture> | null = null;

/** Exported so StaffBench's collapsed plaque can show the same crest face
 *  (and share the same cached texture instance) rather than building its
 *  own separate copy. */
export function useSharedCrestTexture(): THREE.CanvasTexture | null {
  const [texture, setTexture] = useState(sharedCrestTexture);
  useEffect(() => {
    if (sharedCrestTexture) {
      setTexture(sharedCrestTexture);
      return;
    }
    if (!sharedCrestPromise) sharedCrestPromise = buildCrestTexture();
    let cancelled = false;
    sharedCrestPromise.then((t) => {
      sharedCrestTexture = t;
      if (!cancelled) setTexture(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return texture;
}

/**
 * Loads one of the club's own cromo images (public/cromos/*.webp) — returns
 * null while it's loading or on failure. Textures are cached by URL in
 * lib/cromo-texture.ts, so re-mounting the same card (a substitute's row
 * collapsing and re-expanding) doesn't re-decode the image.
 */
export function useCromoTexture(url: string): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    setTexture(null);
    loadCromoTexture(url).then((t) => {
      if (!cancelled) setTexture(t);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return texture;
}

/**
 * Disposes a CanvasTexture when it's replaced or the owning component
 * unmounts. Only used for the shared crest texture here — the per-cromo
 * photo textures are cached by URL (lib/cromo-texture.ts) and reused across
 * mount/unmount, so disposing them on unmount would break the next reveal.
 */
export function useDisposableTexture(texture: THREE.Texture) {
  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);
}

export const CARD_WIDTH = 1.3;
export const CARD_HEIGHT = CARD_WIDTH / CARD_ASPECT;

// The enlarged "click to zoom" card is simply the same cromo, bigger — same
// aspect ratio, its own plane so it isn't a scaled reuse of the small one.
export const DETAIL_CARD_WIDTH = 1.2;
export const DETAIL_CARD_HEIGHT = DETAIL_CARD_WIDTH / CARD_ASPECT;

// Fixed "presentation" point in front of the camera a detailed card flies
// to. The camera sits at [0,11,16] looking at [0,0,0] (PitchScene.tsx) with
// only a small OrbitControls range, so a constant point along that ray stays
// well-framed without tracking the camera every frame.
const DETAIL_POINT = new THREE.Vector3(0, 4.2, 8.5);
const DETAIL_SCALE = 3.4;

interface CromoMeshProps {
  /** Field-size cromo (public/cromos/<slug>.webp) — the small, on-pitch face. */
  photoUrl: string;
  /** 2x cromo (public/cromos/<slug>@2x.webp) — used only once a card is
   *  flown toward the camera and enlarged, so it stays crisp up close. */
  photoUrl2x: string;
  position3D: [number, number, number];
  dimmed: boolean;
  /** True while this card's row/bench is the active selection — crossfades
   *  the crest into the player face, matching what used to be hover. */
  revealed: boolean;
  isDetailed: boolean;
  rarityColor: string;
  onToggleDetail: () => void;
}

/**
 * The interactive mesh behind every roster card: club crest at rest,
 * crossfading into the real cromo once its row is activated (button-driven —
 * see `revealed`, owned by TacticalPitchRoster.tsx). Clicking a revealed
 * card flies it toward the camera and enlarges it — the same cromo, at its
 * higher-resolution 2x asset — clicking it again, clicking empty space, or
 * Escape closes it (TacticalPitchRoster.tsx owns which card, if any, is
 * detailed).
 *
 * Cards billboard to the camera (`<Billboard>`) rather than sitting at a
 * fixed rotation — a fixed angle was tuned for a card near the origin, but
 * cards fan out across both the pitch's length (x: -7.6 to 3.8, one line per
 * position) and width (z: up to ±5.75 within a line), and at those offsets a
 * static rotation increasingly misses square-on with an off-axis camera.
 *
 * Billboard's position/scale are driven imperatively (via its forwarded
 * ref, see node_modules/@react-three/drei/core/Billboard.js) rather than as
 * static props, since detail mode needs them to interpolate continuously
 * between the card's formation spot and DETAIL_POINT.
 */
export function CromoMesh({
  photoUrl,
  photoUrl2x,
  position3D,
  dimmed,
  revealed,
  isDetailed,
  rarityColor,
  onToggleDetail,
}: CromoMeshProps) {
  const crestTexture = useSharedCrestTexture();
  // The 2x asset is only ever needed once a card is actually opened, but
  // loadCromoTexture's cache means requesting it eagerly here is cheap on
  // repeat visits — kept simple rather than deferring the fetch to
  // isDetailed, since every card in a revealed row is a likely click target.
  const frontTexture = useCromoTexture(photoUrl);
  const detailTexture = useCromoTexture(photoUrl2x);

  const billboardRef = useRef<THREE.Group>(null);
  const revealProgress = useRef(0);
  const detailProgress = useRef(0);
  // Read directly by HoloMaterial's own useFrame — see its opacityRef prop.
  const crestOpacity = useRef(1);
  const frontOpacity = useRef(0);
  const detailOpacity = useRef(0);

  const restPosition = useMemo(() => new THREE.Vector3(...position3D), [position3D]);
  const scratchPos = useRef(new THREE.Vector3()).current;

  const cardScale = dimmed ? 0.9 : 1;
  const cardOpacity = dimmed ? 0.25 : 1;

  useFrame((_, delta) => {
    const detailTarget = isDetailed ? 1 : 0;
    detailProgress.current = THREE.MathUtils.damp(detailProgress.current, detailTarget, 4, delta);

    const revealTarget = dimmed ? 0 : revealed ? 1 : 0;
    revealProgress.current = THREE.MathUtils.damp(revealProgress.current, revealTarget, 5, delta);

    const notDetailed = 1 - detailProgress.current;
    crestOpacity.current = (1 - revealProgress.current) * cardOpacity * notDetailed;
    frontOpacity.current = revealProgress.current * cardOpacity * notDetailed;
    detailOpacity.current = detailProgress.current;

    if (billboardRef.current) {
      scratchPos.copy(restPosition).lerp(DETAIL_POINT, detailProgress.current);
      billboardRef.current.position.copy(scratchPos);
      const scale = THREE.MathUtils.lerp(cardScale, DETAIL_SCALE, detailProgress.current);
      billboardRef.current.scale.setScalar(scale);
    }
  });

  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (dimmed) return;
    onToggleDetail();
  };

  return (
    <Billboard
      ref={billboardRef}
      onClick={handleClick}
    >
      {crestTexture && (
        <mesh position={[0, 0, 0.002]}>
          <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
          <HoloMaterial map={crestTexture} opacityRef={crestOpacity} rarityColor={rarityColor} maskStrength={0.9} />
        </mesh>
      )}
      {frontTexture && (
        <mesh position={[0, 0, 0.003]}>
          <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
          <HoloMaterial map={frontTexture} opacityRef={frontOpacity} rarityColor={rarityColor} maskStrength={0.55} />
        </mesh>
      )}
      {detailTexture && (
        <mesh position={[0, 0, 0.004]}>
          <planeGeometry args={[DETAIL_CARD_WIDTH, DETAIL_CARD_HEIGHT]} />
          <HoloMaterial map={detailTexture} opacityRef={detailOpacity} rarityColor={rarityColor} maskStrength={0.4} />
        </mesh>
      )}
    </Billboard>
  );
}
