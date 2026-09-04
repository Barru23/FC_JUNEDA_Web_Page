"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Foil-card shader: fresnel (view-angle-driven rim) × a slow animated
 * iridescent hue sweep × a mask confining the shimmer to the card's own
 * frame (rather than washing over the whole card). Unlike a CSS
 * mix-blend-mode foil effect, this genuinely responds to the real camera
 * angle and the scene's lights, because it runs per-pixel against the
 * actual view vector.
 *
 * `opacity` drives the crest <-> player crossfade (PlayerCromo.tsx swaps two
 * of these layered on top of each other); `maskStrength` scales how much of
 * the card the shimmer is allowed to touch. The mask itself is derived from
 * the card texture's own pixels — saturated and not near-white — rather
 * than a fixed shape: the club's real cromos put the player's photo (mid
 * tones, often the near-white studio backdrop) in the middle of the card
 * and the saturated red/navy frame around the edge, the opposite of the old
 * procedurally-drawn cards this replaced (dark all over, bright avatar
 * ring in the middle). A radial mask centred on the card would land the
 * shimmer squarely on the photo and blow it out; reading the texture
 * instead keeps the shimmer on the frame for both the player (red) and
 * staff (navy) templates without hard-coding either one.
 */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uTime;
  uniform vec3 uRarityColor;
  uniform float uMaskStrength;

  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewDir;

  vec3 hsv2rgb(vec3 c) {
    vec4 k = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + k.xyz) * 6.0 - k.www);
    return c.z * mix(k.xxx, clamp(p - k.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    vec4 base = texture2D(uMap, vUv);
    if (uOpacity <= 0.001) discard;

    float fresnel = pow(1.0 - clamp(dot(vNormalView, vViewDir), 0.0, 1.0), 2.2);

    // Frame mask: brightest on saturated, non-near-white pixels — the card's
    // red/navy frame and printed panels — and zero on the photo/white areas.
    float maxC = max(base.r, max(base.g, base.b));
    float minC = min(base.r, min(base.g, base.b));
    float saturation = maxC - minC;
    float luma = dot(base.rgb, vec3(0.299, 0.587, 0.114));
    float frameness = clamp(saturation * 2.2, 0.0, 1.0) * (1.0 - smoothstep(0.72, 0.94, luma));
    float mask = frameness * uMaskStrength;

    float hue = fract(uTime * 0.06 + vUv.x * 1.4 + vUv.y * 0.6 + fresnel * 2.0);
    vec3 iridescent = hsv2rgb(vec3(hue, 0.55, 1.0));
    vec3 tinted = mix(iridescent, uRarityColor, 0.35);

    float shimmerAmount = mask * (0.25 + fresnel * 0.85);
    vec3 color = mix(base.rgb, base.rgb + tinted * 0.8, clamp(shimmerAmount, 0.0, 1.0));
    color += uRarityColor * fresnel * 0.15 * uMaskStrength;
    // Pushed intentionally above 1.0 at grazing angles within the masked
    // zone — this shader writes gl_FragColor directly (no tonemapping/
    // colorspace chunks), so the overbright peak survives to the bloom
    // pass in PitchScene.tsx instead of being clamped away.
    color += tinted * pow(fresnel, 3.0) * mask * 1.4;

    gl_FragColor = vec4(color, base.a * uOpacity);
  }
`;

interface HoloMaterialProps {
  map: THREE.Texture;
  /** Read every frame rather than taken as a plain prop, so the parent can
   *  drive a damped crossfade from its own useFrame without forcing a
   *  React re-render every frame just to push a number through. */
  opacityRef: React.RefObject<number>;
  rarityColor?: string;
  maskStrength?: number;
}

export function HoloMaterial({ map, opacityRef, rarityColor = "#e10600", maskStrength = 1 }: HoloMaterialProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uOpacity: { value: opacityRef.current },
      uTime: { value: 0 },
      uRarityColor: { value: new THREE.Color(rarityColor) },
      uMaskStrength: { value: maskStrength },
    }),
    // map/rarityColor identity changes rebuild uniforms; opacity/maskStrength are pushed every frame below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [map, rarityColor]
  );

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    materialRef.current.uniforms.uOpacity.value = opacityRef.current;
    materialRef.current.uniforms.uMaskStrength.value = maskStrength;
  });

  return (
    <shaderMaterial
      ref={materialRef}
      vertexShader={VERTEX}
      fragmentShader={FRAGMENT}
      uniforms={uniforms}
      transparent
      depthWrite={false}
    />
  );
}
