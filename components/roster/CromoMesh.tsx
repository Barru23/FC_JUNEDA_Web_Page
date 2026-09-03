"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { HoloMaterial } from "./HoloMaterial";
import { buildCrestTexture } from "@/lib/cromo-texture";

// Shared across every card — loaded once, not once per card.
let sharedCrestTexture: THREE.CanvasTexture | null = null;
let sharedCrestPromise: Promise<THREE.CanvasTexture> | null = null;

function useSharedCrestTexture(): THREE.CanvasTexture | null {
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
 * Loads a player/staff photo for the card avatar — returns null while
 * loading, on failure, or when `url` is undefined (every current squad
 * record, since SquadPlayer.photo isn't populated yet). PlayerCromo/
 * StaffCromo fall back to the initials draw whenever this is null, so
 * populating `photo` later needs no further code change.
 */
export function usePlayerPhoto(url?: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!url) {
      setImage(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (!cancelled) setImage(null);
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [url]);
  return image;
}

/**
 * Disposes a CanvasTexture when it's replaced or the owning component
 * unmounts. Substitute cards genuinely unmount/remount as a formation row
 * collapses and re-expands (only starters stay mounted while collapsed), so
 * without this every re-expand would leak a fresh GPU texture — the same
 * leak Stage 0 fixed for the pitch's own grass texture.
 */
export function useDisposableTexture(texture: THREE.Texture) {
  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);
}

export const CARD_WIDTH = 1.15;
export const CARD_HEIGHT = CARD_WIDTH / (496 / 664);

interface CromoMeshProps {
  frontTexture: THREE.Texture;
  backTexture: THREE.Texture;
  position3D: [number, number, number];
  dimmed: boolean;
  rarityColor: string;
  rotationY?: number;
}

/**
 * The interactive mesh behind every roster card: club crest at rest,
 * crossfading into the player on hover (or first tap on touch, which has no
 * hover), clicking again once revealed flips to the bio/back face.
 */
export function CromoMesh({
  frontTexture,
  backTexture,
  position3D,
  dimmed,
  rarityColor,
  rotationY = Math.PI / 4.4,
}: CromoMeshProps) {
  const crestTexture = useSharedCrestTexture();
  const [hovered, setHovered] = useState(false);
  const [flipped, setFlipped] = useState(false);

  const flipGroup = useRef<THREE.Group>(null);
  const flipAngle = useRef(0);
  const hoverProgress = useRef(0);
  // Read directly by HoloMaterial's own useFrame — see its opacityRef prop.
  const crestOpacity = useRef(1);
  const frontOpacity = useRef(0);

  const cardScale = dimmed ? 0.9 : 1;
  const cardOpacity = dimmed ? 0.25 : 1;

  useFrame((_, delta) => {
    const flipTarget = flipped ? Math.PI : 0;
    flipAngle.current = THREE.MathUtils.damp(flipAngle.current, flipTarget, 6, delta);
    if (flipGroup.current) flipGroup.current.rotation.y = flipAngle.current;

    const hoverTarget = dimmed ? 0 : hovered ? 1 : 0;
    hoverProgress.current = THREE.MathUtils.damp(hoverProgress.current, hoverTarget, 5, delta);
    crestOpacity.current = (1 - hoverProgress.current) * cardOpacity;
    frontOpacity.current = hoverProgress.current * cardOpacity;
  });

  // Dimmed cards behave like the old pointer-events:none — inert, and the
  // event stops here rather than bubbling on to some other row's handlers.
  const handlePointerOver = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (dimmed) return;
    setHovered(true);
  };
  const handlePointerOut = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (dimmed) return;
    setHovered(false);
    setFlipped(false);
  };
  const handleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (dimmed) return;
    // Touch has no hover: the first tap reveals the player, matching desktop
    // hover; a second tap (already revealed) flips to the bio side.
    if (!hovered) setHovered(true);
    else setFlipped((f) => !f);
  };

  return (
    <group
      position={position3D}
      rotation={[0, rotationY, 0]}
      scale={cardScale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <group ref={flipGroup}>
        {crestTexture && (
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
            <HoloMaterial map={crestTexture} opacityRef={crestOpacity} rarityColor={rarityColor} maskStrength={0.9} />
          </mesh>
        )}
        <mesh position={[0, 0, 0.003]}>
          <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
          <HoloMaterial map={frontTexture} opacityRef={frontOpacity} rarityColor={rarityColor} maskStrength={0.55} />
        </mesh>
        <mesh position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
          <meshBasicMaterial map={backTexture} transparent opacity={cardOpacity} />
        </mesh>
      </group>
    </group>
  );
}
