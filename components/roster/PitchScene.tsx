"use client";

import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

interface PitchSceneProps {
  children: React.ReactNode;
  /** Fires when a click hits nothing interactive — used to close a detailed
   *  cromo by clicking empty pitch/background. */
  onBackgroundClick?: () => void;
}

export function PitchScene({ children, onBackgroundClick }: PitchSceneProps) {
  // Clamp device pixel ratio so a 3x-retina phone doesn't force full-resolution
  // MSAA; PerformanceMonitor steps it down further if frame times sag.
  const [dpr, setDpr] = useState<[number, number]>([1, 1.75]);

  return (
    <Canvas
      camera={{ position: [0, 11, 16], fov: 45 }}
      shadows
      dpr={dpr}
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={onBackgroundClick}
    >
      <PerformanceMonitor
        onIncline={() => setDpr([1, 1.75])}
        onDecline={() => setDpr([1, 1])}
      />
      {/* Il·luminació equilibrada per a l'escena tàctica */}
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Ambient vermell identitari del CF Juneda */}
      <pointLight position={[0, -2, 0]} intensity={0.35} color="#e10600" />
      {/* Fill light suau des de dalt */}
      <pointLight position={[0, 6, 0]} intensity={0.25} color="#ffffff" />

      {/* Contingut del camp i jugadors */}
      {children}

      {/* Controls suaus de gir limitat per a la sensació de diorama viu */}
      <OrbitControls
        target={[0, 0, 0]}
        enablePan={false}
        enableZoom={false}
        enableRotate={true}
        rotateSpeed={0.5}
        minAzimuthAngle={-0.18}
        maxAzimuthAngle={0.18}
        minPolarAngle={0.7}
        maxPolarAngle={1.15}
      />

      {/* Confines the glow to genuinely bright elements (the pitch's red
          under-glow, the holo cromos' iridescent peaks) rather than washing
          the whole scene — those are the only things drawn with
          toneMapped=false / boosted brightness, everything else stays under
          the threshold. Raised from 0.65: the real cromos print a near-white
          photo backdrop and stat panels (~0.95+ luma) that the old
          procedurally-drawn cards (dark all over) never had, and
          HoloMaterial writes color untonemapped — at 0.65 that backdrop
          alone would bloom into a veil over every revealed card. */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.92} luminanceSmoothing={0.25} intensity={0.9} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
