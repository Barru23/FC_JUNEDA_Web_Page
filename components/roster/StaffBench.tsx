"use client";

import React, { useMemo } from "react";
import { Html } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import clsx from "clsx";
import type { StaffMember } from "@/lib/squad";

interface StaffBenchProps {
  staff: StaffMember[];
  isActive: boolean;
  isDimmed: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
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

      {/* ── Estat Replegat: Cromo únic representatiu de la banqueta ── */}
      {!isActive && (
        <Html
          transform
          position={[7.0, 0.5, 0.0]}
          rotation={[0, Math.PI / 4.4, 0]}
          scale={0.34}
          style={{ pointerEvents: "auto" }}
          distanceFactor={11}
        >
          <motion.div
            onMouseEnter={onActivate}
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
            }}
            className={clsx(
              "relative h-[166px] w-[124px] cursor-pointer rounded-2xl border p-3 shadow-2xl transition-all duration-200 select-none",
              isDimmed
                ? "border-white/5 bg-surface/70 opacity-25 scale-90 pointer-events-none"
                : "border-white/15 bg-gradient-to-b from-[#161c2a]/95 via-[#0f1422]/95 to-[#090c14]/95 backdrop-blur-md hover:border-blue-500 hover:shadow-[0_0_24px_rgba(30,58,138,0.5)] hover:scale-105"
            )}
            whileHover={!isDimmed ? { y: -6 } : undefined}
          >
            <div className="flex h-full flex-col justify-between text-center">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-blue-400/40 bg-navy/40 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-200">
                  STAFF
                </span>
                <span className="font-display text-xs font-bold text-white/30">
                  4 pers.
                </span>
              </div>

              {/* Icona central de banqueta */}
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-blue-400/30 bg-gradient-to-br from-navy/50 to-carbon shadow-inner">
                <span className="text-xl">📋</span>
              </div>

              <div>
                <h4 className="font-display text-[12px] font-bold text-white leading-tight">
                  Cos Tècnic
                </h4>
                <p className="text-[8px] uppercase tracking-wider text-white/40">
                  Banqueta Oficial
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-1 text-[7px] font-bold uppercase tracking-widest text-white/35">
                <span>CF JUNEDA</span>
                <span className="text-blue-400">STAFF</span>
              </div>
            </div>
          </motion.div>
        </Html>
      )}

      {/* ── Estat Desplegat: Tots els membres del staff ── */}
      {isActive && (
        <group
          onPointerEnter={(e) => {
            e.stopPropagation();
            onActivate();
          }}
        >
          {staff.map((member, index) => {
            const pos = positions[index] || [7.0, 1.25, 0];
            const initials = member.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <Html
                key={member.id}
                transform
                position={pos}
                rotation={[0, Math.PI / 4.4, 0]}
                scale={0.34}
                style={{ pointerEvents: "auto" }}
                distanceFactor={11}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.6, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  className="relative h-[166px] w-[124px] cursor-pointer rounded-2xl border border-blue-500/40 bg-gradient-to-b from-[#161c2a]/95 via-[#0f1422]/95 to-[#090c14]/95 p-3 shadow-2xl backdrop-blur-md hover:border-blue-400 hover:shadow-[0_0_24px_rgba(30,58,138,0.6)] hover:scale-105 select-none"
                >
                  <div className="flex h-full flex-col justify-between text-center">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-blue-400/40 bg-navy/40 px-1.5 py-0.5 text-[7.5px] font-bold uppercase tracking-wider text-blue-200">
                        {member.role}
                      </span>
                      <span className="text-[10px] text-blue-400">●</span>
                    </div>

                    <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-full border border-blue-400/30 bg-gradient-to-br from-navy/60 to-black shadow-inner">
                      <span className="font-display text-sm font-extrabold tracking-wider text-white">
                        {initials}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-display truncate text-[11.5px] font-bold text-white leading-tight">
                        {member.name}
                      </h4>
                      <p className="line-clamp-2 text-[7.5px] leading-tight text-white/50 mt-0.5">
                        {member.bio || member.role}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-1 text-[7px] font-bold uppercase tracking-widest text-white/35">
                      <span>CF JUNEDA</span>
                      <span className="text-blue-400">25/26</span>
                    </div>
                  </div>
                </motion.div>
              </Html>
            );
          })}
        </group>
      )}
    </group>
  );
}
