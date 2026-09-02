"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

interface PitchSceneProps {
  children: React.ReactNode;
}

export function PitchScene({ children }: PitchSceneProps) {
  return (
    <Canvas
      camera={{ position: [12, 10, 14], fov: 45 }}
      shadows
      style={{ background: "transparent" }}
      gl={{ antialias: true, alpha: true }}
    >
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
    </Canvas>
  );
}
