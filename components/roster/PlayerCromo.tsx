"use client";

import { useMemo } from "react";
import type { SquadPlayer } from "@/lib/squad";
import { buildFrontTexture, buildBackTexture } from "@/lib/cromo-texture";
import { CromoMesh, usePlayerPhoto, useDisposableTexture } from "./CromoMesh";

interface PlayerCromoProps {
  player: SquadPlayer;
  position3D: [number, number, number];
  dimmed: boolean;
}

// Rarity reads straight off existing data: starters shine gold, substitutes
// silver — no new field needed on SquadPlayer.
const STARTER_COLOR = "#FBBF24";
const SUB_COLOR = "#c7cbd1";

export function PlayerCromo({ player, position3D, dimmed }: PlayerCromoProps) {
  const initials = player.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const rarityColor = player.starter ? STARTER_COLOR : SUB_COLOR;

  // player.photo is reserved for when real photos arrive (lib/squad.ts) —
  // this resolves to null for every current record, so the front texture
  // always falls back to initials until it's actually populated.
  const photoImage = usePlayerPhoto(player.photo);

  const frontTexture = useMemo(
    () =>
      buildFrontTexture({
        number: player.number,
        badgeLabel: player.starter ? "11" : "SUPL",
        initials,
        name: player.name,
        subtitle: player.role || player.position,
        positionBadge: POSITION_BADGE[player.position],
        rarityColor,
        photoImage,
      }),
    [player, initials, rarityColor, photoImage]
  );

  const backTexture = useMemo(
    () =>
      buildBackTexture({
        number: player.number,
        headerRight: player.position,
        name: player.name,
        bio: player.bio || "Jugador del primer equip del CF Juneda per a la temporada 25/26.",
        rarityColor,
      }),
    [player, rarityColor]
  );

  useDisposableTexture(frontTexture);
  useDisposableTexture(backTexture);

  return (
    <CromoMesh
      frontTexture={frontTexture}
      backTexture={backTexture}
      position3D={position3D}
      dimmed={dimmed}
      rarityColor={rarityColor}
    />
  );
}

// Distinct badge per position — the old `player.position[0]` collided
// ("Defenses" and "Davanters" both yield "D").
const POSITION_BADGE: Record<SquadPlayer["position"], string> = {
  Porters: "P",
  Defenses: "DF",
  Migcampistes: "M",
  Davanters: "DV",
};
