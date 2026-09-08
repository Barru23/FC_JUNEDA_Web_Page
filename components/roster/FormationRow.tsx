"use client";

import React, { useMemo } from "react";
import { Html } from "@react-three/drei";
import { PlayerCromo } from "./PlayerCromo";
import { CARD_HEIGHT } from "./CromoMesh";
import type { SquadPlayer, SquadPosition } from "@/lib/squad";

export interface FormationRowConfig {
  position: SquadPosition;
  label: string;
  baseX: number;
  /** Z offsets for the 4-3-3 shape shown at rest — one slot per card. There's
   *  no "starter" flag in the data (the club never designated one), so the
   *  slots are simply filled by ascending dorsal; clicking the line still
   *  fans out every player regardless of this shape. */
  formationZPositions: number[];
}

// Camp horitzontal: les línies s'ordenen d'esquerra (Porters) a dreta
// (Davanters) al llarg de l'eix X; cada jugador d'una línia es reparteix
// en l'eix Z (l'amplada del camp).
export const FORMATION_CONFIG: FormationRowConfig[] = [
  { position: "Porters", label: "Porteria", baseX: -7.6, formationZPositions: [0] },
  { position: "Defenses", label: "Defensa", baseX: -4.4, formationZPositions: [-4.2, -1.4, 1.4, 4.2] },
  { position: "Migcampistes", label: "Mig del Camp", baseX: -0.6, formationZPositions: [-3.2, 0, 3.2] },
  { position: "Davanters", label: "Davantera", baseX: 3.8, formationZPositions: [-3.5, 0, 3.5] },
];

// The pitch board (PitchBoard.tsx) is a solid boxGeometry([18, 0.4, 12])
// centred at y=0, so its grass surface sits at y=0.2. A card's Billboard
// position is its vertical centre, so the rest-state Y has to clear
// (pitch top) + (half the card's height) or the bottom of every card
// renders behind/inside the pitch mesh — cut off right under the crest,
// which is exactly the "camp se'l menja" artifact this fixes.
const PITCH_TOP_Y = 0.2;
const REST_Y = PITCH_TOP_Y + CARD_HEIGHT / 2 + 0.08;

interface FormationRowProps {
  config: FormationRowConfig;
  allPlayers: SquadPlayer[];
  isActive: boolean;
  isDimmed: boolean;
  onToggleActive: () => void;
  detailedId: string | null;
  onToggleDetail: (id: string) => void;
}

export function FormationRow({
  config,
  allPlayers,
  isActive,
  isDimmed,
  onToggleActive,
  detailedId,
  onToggleDetail,
}: FormationRowProps) {
  // En repòs mostrem una formació 4-3-3: els jugadors de dorsal més baix de
  // la línia omplen les posicions de la formació (no hi ha titular/suplent a
  // les dades — és purament una disposició visual). En activar-se es
  // desplega la línia sencera en ventall.
  const formationPlayers = useMemo(
    () => [...allPlayers].sort((a, b) => a.number - b.number).slice(0, config.formationZPositions.length),
    [allPlayers, config.formationZPositions.length]
  );
  const displayPlayers = isActive ? allPlayers : formationPlayers;

  // Càlcul de les posicions 3D dels cromos
  const positions = useMemo(() => {
    if (!isActive) {
      return config.formationZPositions.map((z) => [config.baseX, REST_Y, z] as [number, number, number]);
    }

    // Desplegament en ventall suau:
    // Elevem la filera a y=1.35 i repartim uniformement en l'eix Z
    const count = allPlayers.length;
    const spacing = Math.min(2.1, 10.5 / Math.max(count - 1, 1));
    const totalW = (count - 1) * spacing;
    const startZ = -totalW / 2;

    return allPlayers.map((_, i) => {
      const z = startZ + i * spacing;
      // Arc subtil en profunditat (ventall)
      const offsetCenter = (i - (count - 1) / 2) / ((count - 1) / 2 || 1);
      const arcX = config.baseX - (1 - Math.abs(offsetCenter)) * 0.35;
      return [arcX, 1.35, z] as [number, number, number];
    });
  }, [isActive, config, allPlayers]);

  return (
    <group>
      {/* ── Etiqueta tàctica flotant al lateral de cada línia — el botó que
          activa/desactiva la línia (cap gestor de hover, tot per clic). En
          activar-se, l'etiqueta creix (scale del propi Html, no només un
          transform CSS) perquè es llegeixi clarament per sobre de la resta. ── */}
      <Html
        transform
        position={[config.baseX, isActive ? 1.4 : 0.6, 6.6]}
        rotation={[0, 0, 0]}
        scale={isActive ? 0.42 : 0.33}
        style={{ pointerEvents: "auto" }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive();
          }}
          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 backdrop-blur-md transition-all duration-300 ${
            isActive
              ? "border-brand bg-brand/30 text-white shadow-[0_0_16px_rgba(225,6,0,0.5)]"
              : isDimmed
              ? "border-white/5 bg-black/40 text-white/20 opacity-30"
              : "border-white/15 bg-black/60 text-white/70 hover:border-white/40 hover:text-white"
          }`}
        >
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isActive ? "bg-brand animate-ping" : "bg-white/40"
            }`}
          />
          <span className="font-display text-[13px] font-bold uppercase tracking-wider">
            {config.label}
          </span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/80">
            {allPlayers.length}
          </span>
        </div>
      </Html>

      {/* ── Cromos dels jugadors de la filera ── */}
      <group>
        {displayPlayers.map((player, index) => {
          const pos = positions[index] || [config.baseX, REST_Y, 0];
          const isDetailed = detailedId === player.id;
          const dimmed = isDimmed || (detailedId !== null && !isDetailed);
          return (
            <PlayerCromo
              key={player.id}
              player={player}
              position3D={pos}
              dimmed={dimmed}
              revealed={isActive}
              isDetailed={isDetailed}
              onToggleDetail={() => onToggleDetail(player.id)}
            />
          );
        })}
      </group>
    </group>
  );
}
