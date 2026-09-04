"use client";

import type { SquadPlayer } from "@/lib/squad";
import { CromoMesh } from "./CromoMesh";

interface PlayerCromoProps {
  player: SquadPlayer;
  position3D: [number, number, number];
  dimmed: boolean;
  revealed: boolean;
  isDetailed: boolean;
  onToggleDetail: () => void;
}

// All player cromos share the club's red frame — the card design itself is
// what distinguishes a player from staff (StaffBench.tsx's navy frame), so
// there's no separate "starter vs substitute" rarity tier to color for.
const PLAYER_COLOR = "#E10600";

export function PlayerCromo({ player, position3D, dimmed, revealed, isDetailed, onToggleDetail }: PlayerCromoProps) {
  return (
    <CromoMesh
      photoUrl={player.photo}
      photoUrl2x={player.photo2x}
      position3D={position3D}
      dimmed={dimmed}
      revealed={revealed}
      isDetailed={isDetailed}
      rarityColor={PLAYER_COLOR}
      onToggleDetail={onToggleDetail}
    />
  );
}
