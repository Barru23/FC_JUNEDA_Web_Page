"use client";

import React, { useMemo } from "react";
import { Html } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { PlayerCromo } from "./PlayerCromo";
import type { SquadPlayer, SquadPosition } from "@/lib/squad";

export interface FormationRowConfig {
  position: SquadPosition;
  label: string;
  baseZ: number;
  starterXPositions: number[];
}

export const FORMATION_CONFIG: FormationRowConfig[] = [
  {
    position: "Porters",
    label: "Porteria",
    baseZ: 6.4,
    starterXPositions: [0],
  },
  {
    position: "Defenses",
    label: "Defensa",
    baseZ: 2.8,
    starterXPositions: [-4.2, -1.4, 1.4, 4.2],
  },
  {
    position: "Migcampistes",
    label: "Mig del Camp",
    baseZ: -1.2,
    starterXPositions: [-3.2, 0, 3.2],
  },
  {
    position: "Davanters",
    label: "Davantera",
    baseZ: -5.6,
    starterXPositions: [-3.5, 0, 3.5],
  },
];

interface FormationRowProps {
  config: FormationRowConfig;
  starters: SquadPlayer[];
  allPlayers: SquadPlayer[];
  isActive: boolean;
  isDimmed: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

export function FormationRow({
  config,
  starters,
  allPlayers,
  isActive,
  isDimmed,
  onActivate,
  onDeactivate,
}: FormationRowProps) {
  // Quan està actiu mostrem tots els jugadors (titulars + suplents), sinó només titulars
  const displayPlayers = isActive ? allPlayers : starters;

  // Càlcul de les posicions 3D dels cromos
  const positions = useMemo(() => {
    if (!isActive) {
      // Posicions estàndard dels titulars a sobre de la gespa
      return config.starterXPositions.map(
        (x) => [x, 0.5, config.baseZ] as [number, number, number]
      );
    }

    // Desplegament en ventall suau:
    // Elevem la filera a y=1.35 i repartim uniformement en l'eix X
    const count = allPlayers.length;
    const spacing = Math.min(2.1, 10.5 / Math.max(count - 1, 1));
    const totalW = (count - 1) * spacing;
    const startX = -totalW / 2;

    return allPlayers.map((_, i) => {
      const x = startX + i * spacing;
      // Arc subtil en profunditat (ventall)
      const offsetCenter = (i - (count - 1) / 2) / ((count - 1) / 2 || 1);
      const arcZ = config.baseZ - (1 - Math.abs(offsetCenter)) * 0.35;
      return [x, 1.35, arcZ] as [number, number, number];
    });
  }, [isActive, config, allPlayers]);

  const numSubstitutes = allPlayers.length - starters.length;

  return (
    <group>
      {/* ── Zona invisible de raycast per detectar el hover de tota la línia ── */}
      <mesh
        position={[0, 0.45, config.baseZ]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          onActivate();
        }}
        onPointerLeave={(e) => {
          e.stopPropagation();
          onDeactivate();
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (isActive) onDeactivate();
          else onActivate();
        }}
      >
        <boxGeometry args={[11.8, 1.8, 3.2]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Etiqueta tàctica flotant al lateral de cada línia ── */}
      <Html
        transform
        position={[-6.2, isActive ? 1.4 : 0.6, config.baseZ]}
        rotation={[0, Math.PI / 4.4, 0]}
        scale={0.3}
        style={{ pointerEvents: "auto" }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (isActive) onDeactivate();
            else onActivate();
          }}
          onMouseEnter={onActivate}
          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-md transition-all duration-300 ${
            isActive
              ? "border-brand bg-brand/30 text-white shadow-[0_0_16px_rgba(225,6,0,0.5)] scale-105"
              : isDimmed
              ? "border-white/5 bg-black/40 text-white/20 opacity-30 pointer-events-none"
              : "border-white/15 bg-black/60 text-white/70 hover:border-white/40 hover:text-white"
          }`}
        >
          <div
            className={`h-2 w-2 rounded-full ${
              isActive ? "bg-brand animate-ping" : "bg-white/40"
            }`}
          />
          <span className="font-display text-[11px] font-bold uppercase tracking-wider">
            {config.label}
          </span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[9px] font-semibold text-white/80">
            {isActive ? `${allPlayers.length}` : `+${numSubstitutes}`}
          </span>
        </div>
      </Html>

      {/* ── Cromos dels jugadors de la filera ── */}
      <group
        onPointerEnter={(e) => {
          e.stopPropagation();
          onActivate();
        }}
      >
        {displayPlayers.map((player, index) => {
          const pos = positions[index] || [0, 0.5, config.baseZ];
          return (
            <PlayerCromo
              key={player.id}
              player={player}
              position3D={pos}
              dimmed={isDimmed}
              isExpanded={isActive}
            />
          );
        })}
      </group>
    </group>
  );
}
