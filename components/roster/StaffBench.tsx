"use client";

import React, { useMemo } from "react";
import { Html, Billboard } from "@react-three/drei";
import type { StaffMember } from "@/lib/squad";
import { CromoMesh, CARD_WIDTH, CARD_HEIGHT, useSharedCrestTexture } from "./CromoMesh";

interface StaffBenchProps {
  staff: StaffMember[];
  isActive: boolean;
  isDimmed: boolean;
  onToggleActive: () => void;
  detailedId: string | null;
  onToggleDetail: (id: string) => void;
}

const STAFF_COLOR = "#1E3A8A"; // navy — matches the staff cromo's own frame

// Same clearance fix as FormationRow.tsx: the pitch board (PitchBoard.tsx)
// is a solid box centred at y=0 with its grass surface at y=0.2, so the
// rest-state plaque's centre has to clear that plus half its own height or
// its lower half renders behind/inside the pitch mesh.
const PITCH_TOP_Y = 0.2;
const REST_Y = PITCH_TOP_Y + CARD_HEIGHT / 2 + 0.08;

/**
 * The collapsed bench isn't any one person, so it gets a plain generic
 * plaque (the shared crest face) rather than the interactive crest-reveal
 * cromo — a static face, no hover/flip of its own (the wrapping group
 * already bubbles hover up to expand the bench).
 */
function StaffPlaque({ position3D, dimmed }: { position3D: [number, number, number]; dimmed: boolean }) {
  const texture = useSharedCrestTexture();
  if (!texture) return null;

  return (
    <Billboard position={position3D} scale={dimmed ? 0.9 : 1}>
      <mesh>
        <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
        <meshBasicMaterial map={texture} transparent opacity={dimmed ? 0.25 : 1} />
      </mesh>
    </Billboard>
  );
}

function StaffCromo({
  member,
  position3D,
  dimmed,
  isDetailed,
  onToggleDetail,
}: {
  member: StaffMember;
  position3D: [number, number, number];
  dimmed: boolean;
  isDetailed: boolean;
  onToggleDetail: () => void;
}) {
  return (
    <CromoMesh
      photoUrl={member.photo}
      photoUrl2x={member.photo2x}
      position3D={position3D}
      dimmed={dimmed}
      // Only ever mounted while the bench is expanded (isActive), so it's
      // always in its revealed state — no crest-only rest state of its own.
      revealed
      isDetailed={isDetailed}
      rarityColor={STAFF_COLOR}
      onToggleDetail={onToggleDetail}
    />
  );
}

export function StaffBench({
  staff,
  isActive,
  isDimmed,
  onToggleActive,
  detailedId,
  onToggleDetail,
}: StaffBenchProps) {
  // Posicions 3D dels membres del staff
  // Posició base: centrat i a la part superior del camp horitzontal [X=0, Z=-7.4]
  const positions = useMemo(() => {
    if (!isActive) {
      return [[0.0, REST_Y, -7.4] as [number, number, number]];
    }

    // Quan s'expandeix, repartim els 5 membres horitzontalment per sobre del camp
    const count = staff.length;
    const spacing = 2.4;
    const startX = -((count - 1) * spacing) / 2;

    return staff.map((_, i) => [startX + i * spacing, 1.25, -7.6] as [number, number, number]);
  }, [isActive, staff]);

  return (
    <group>
      {/* ── Indicador de banqueta — el botó que activa/desactiva, cap
          gestor de hover. ── */}
      <Html
        transform
        position={[0, isActive ? 2.5 : 1.7, -7.4]}
        rotation={[0, 0, 0]}
        scale={isActive ? 0.4 : 0.31}
        style={{ pointerEvents: "auto" }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleActive();
          }}
          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 backdrop-blur-md transition-all duration-300 ${
            isActive
              ? "border-blue-400 bg-navy/60 text-white shadow-[0_0_18px_rgba(30,58,138,0.7)]"
              : isDimmed
              ? "border-white/5 bg-black/40 text-white/20 opacity-30"
              : "border-white/15 bg-black/60 text-white/70 hover:border-blue-400/50 hover:text-white"
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <span className="font-display text-[13px] font-bold uppercase tracking-wider">
            Banqueta & Staff
          </span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-semibold text-white/80">
            {staff.length}
          </span>
        </div>
      </Html>

      {/* ── Estat replegat: un únic cromo representatiu de la banqueta ── */}
      {!isActive && <StaffPlaque position3D={[0.0, REST_Y, -7.4]} dimmed={isDimmed} />}

      {/* ── Estat desplegat: tots els membres del staff ── */}
      {isActive && (
        <group>
          {staff.map((member, index) => {
            const pos = positions[index] || [0, 1.25, -7.4];
            const isDetailed = detailedId === member.id;
            const dimmed = isDimmed || (detailedId !== null && !isDetailed);
            return (
              <StaffCromo
                key={member.id}
                member={member}
                position3D={pos}
                dimmed={dimmed}
                isDetailed={isDetailed}
                onToggleDetail={() => onToggleDetail(member.id)}
              />
            );
          })}
        </group>
      )}
    </group>
  );
}
