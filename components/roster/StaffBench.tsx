"use client";

import React, { useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { StaffMember } from "@/lib/squad";
import { buildFrontTexture, buildBackTexture } from "@/lib/cromo-texture";
import { CromoMesh, CARD_WIDTH, CARD_HEIGHT, usePlayerPhoto, useDisposableTexture } from "./CromoMesh";

interface StaffBenchProps {
  staff: StaffMember[];
  isActive: boolean;
  isDimmed: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

const STAFF_COLOR = "#1E3A8A"; // navy — Cos Tècnic's rarity tier

/**
 * The collapsed bench isn't any one person, so it gets a plain generic
 * plaque rather than the interactive crest-reveal cromo — a static front
 * face, no hover/flip of its own (the wrapping group already bubbles hover
 * up to expand the bench).
 */
function StaffPlaque({ position3D, dimmed }: { position3D: [number, number, number]; dimmed: boolean }) {
  const texture = useMemo(
    () =>
      buildFrontTexture({
        number: "—",
        badgeLabel: "STAFF",
        initials: "CT",
        name: "Cos Tècnic",
        subtitle: "Banqueta Oficial",
        rarityColor: STAFF_COLOR,
      }),
    []
  );
  useDisposableTexture(texture);

  return (
    <mesh position={position3D} rotation={[0, Math.PI / 4.4, 0]} scale={dimmed ? 0.9 : 1}>
      <planeGeometry args={[CARD_WIDTH, CARD_HEIGHT]} />
      <meshBasicMaterial map={texture} transparent opacity={dimmed ? 0.25 : 1} />
    </mesh>
  );
}

function StaffCromo({ member, position3D, dimmed }: { member: StaffMember; position3D: [number, number, number]; dimmed: boolean }) {
  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const photoImage = usePlayerPhoto(member.photo);

  const frontTexture = useMemo(
    () =>
      buildFrontTexture({
        number: "—",
        badgeLabel: "STAFF",
        initials,
        name: member.name,
        subtitle: member.role,
        rarityColor: STAFF_COLOR,
        photoImage,
      }),
    [member, initials, photoImage]
  );

  const backTexture = useMemo(
    () =>
      buildBackTexture({
        number: "—",
        headerRight: member.role,
        name: member.name,
        bio: member.bio || "Membre del cos tècnic del CF Juneda per a la temporada 25/26.",
        rarityColor: STAFF_COLOR,
      }),
    [member]
  );

  useDisposableTexture(frontTexture);
  useDisposableTexture(backTexture);

  return (
    <CromoMesh
      frontTexture={frontTexture}
      backTexture={backTexture}
      position3D={position3D}
      dimmed={dimmed}
      rarityColor={STAFF_COLOR}
    />
  );
}

export function StaffBench({
  staff,
  isActive,
  isDimmed,
  onActivate,
  onDeactivate,
}: StaffBenchProps) {
  // Posicions 3D dels membres del staff
  // Posició base: lateral dret fora del camp [X=7.0, Z=0]
  const positions = useMemo(() => {
    if (!isActive) {
      return [[7.0, 0.5, 0.0] as [number, number, number]];
    }

    // Quan s'expandeix, repartim els 4 membres verticalment al llarg de la banda
    const count = staff.length;
    const spacing = 2.4;
    const startZ = -((count - 1) * spacing) / 2;

    return staff.map((_, i) => [7.2, 1.25, startZ + i * spacing] as [number, number, number]);
  }, [isActive, staff]);

  return (
    <group>
      {/* ── Raycast hitbox per a la banqueta ── */}
      <mesh
        position={[7.0, 0.45, 0]}
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
        <boxGeometry args={[3.2, 2.0, isActive ? 11.5 : 4.0]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Indicador de banqueta ── */}
      <Html
        transform
        position={[7.0, isActive ? 2.5 : 1.7, 0]}
        rotation={[0, Math.PI / 4.4, 0]}
        scale={0.28}
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
              ? "border-blue-400 bg-navy/60 text-white shadow-[0_0_18px_rgba(30,58,138,0.7)] scale-105"
              : isDimmed
              ? "border-white/5 bg-black/40 text-white/20 opacity-30 pointer-events-none"
              : "border-white/15 bg-black/60 text-white/70 hover:border-blue-400/50 hover:text-white"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="font-display text-[11px] font-bold uppercase tracking-wider">
            Banqueta & Staff
          </span>
          <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[9px] font-semibold text-white/80">
            {staff.length}
          </span>
        </div>
      </Html>

      {/* ── Estat replegat: un únic cromo representatiu de la banqueta ── */}
      {!isActive && (
        <group
          onPointerEnter={(e) => {
            e.stopPropagation();
            onActivate();
          }}
        >
          <StaffPlaque position3D={[7.0, 0.5, 0.0]} dimmed={isDimmed} />
        </group>
      )}

      {/* ── Estat desplegat: tots els membres del staff ── */}
      {isActive && (
        <group
          onPointerEnter={(e) => {
            e.stopPropagation();
            onActivate();
          }}
        >
          {staff.map((member, index) => {
            const pos = positions[index] || [7.0, 1.25, 0];
            return <StaffCromo key={member.id} member={member} position3D={pos} dimmed={isDimmed} />;
          })}
        </group>
      )}
    </group>
  );
}
