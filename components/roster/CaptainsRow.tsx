"use client";

import React, { useMemo } from "react";
import { PlayerCromo } from "./PlayerCromo";
import type { SquadPlayer } from "@/lib/squad";

interface CaptainsRowProps {
  captains: SquadPlayer[];
  isActive: boolean;
  detailedId: string | null;
  onToggleDetail: (id: string) => void;
}

// Same clearance the other rows use (PitchBoard.tsx's grass sits at y=0.2) —
// well above it, matching the other rows' "fanned out" height so the
// lineup reads as a deliberate on-pitch presentation.
const CAPTAINS_Y = 1.3;
const SPACING = 2.6;

/**
 * A cross-cutting filter, not a formation line: the 5 designated captains
 * span three different position lines (Davanters, Defenses, Migcampistes),
 * so unlike FormationRow/StaffBench this has no permanent "at rest" shape of
 * its own — it renders nothing until "Capitans" is the active selection,
 * at which point it lines the five up left-to-right across the halfway
 * line in captaincy order (1r to 5è). Selecting it dims every other row via
 * the same isDimmed check they already run against activeRow.
 */
export function CaptainsRow({ captains, isActive, detailedId, onToggleDetail }: CaptainsRowProps) {
  const positions = useMemo(() => {
    const count = captains.length;
    const totalW = (count - 1) * SPACING;
    const startX = -totalW / 2;
    return captains.map((_, i) => [startX + i * SPACING, CAPTAINS_Y, 0] as [number, number, number]);
  }, [captains]);

  if (!isActive) return null;

  return (
    <group>
      {captains.map((player, index) => {
        const isDetailed = detailedId === player.id;
        const dimmed = detailedId !== null && !isDetailed;
        return (
          <PlayerCromo
            key={player.id}
            player={player}
            position3D={positions[index]}
            dimmed={dimmed}
            revealed
            isDetailed={isDetailed}
            onToggleDetail={() => onToggleDetail(player.id)}
          />
        );
      })}
    </group>
  );
}
