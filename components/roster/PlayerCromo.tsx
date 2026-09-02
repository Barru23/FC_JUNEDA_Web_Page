"use client";

import React, { useState } from "react";
import { Html } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import type { SquadPlayer } from "@/lib/squad";

interface PlayerCromoProps {
  player: SquadPlayer;
  position3D: [number, number, number];
  dimmed: boolean;
  scale?: number;
  isExpanded?: boolean;
}

export function PlayerCromo({
  player,
  position3D,
  dimmed,
  scale = 0.34,
}: PlayerCromoProps) {
  const [flipped, setFlipped] = useState(false);

  // Inicials del jugador per a l'avatar
  const initials = player.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Html
      transform
      position={position3D}
      // Orientat lleugerament cap a la càmera isomètrica ([12, 10, 14])
      rotation={[0, Math.PI / 4.4, 0]}
      scale={scale}
      style={{ pointerEvents: "auto" }}
      distanceFactor={11}
    >
      <div
        className={clsx(
          "relative select-none transition-all duration-300",
          dimmed && "pointer-events-none opacity-25 scale-90"
        )}
        style={{ perspective: "1000px" }}
      >
        <motion.div
          onClick={(e) => {
            e.stopPropagation();
            setFlipped(!flipped);
          }}
          className={clsx(
            "relative h-[166px] w-[124px] cursor-pointer rounded-2xl border p-2.5 shadow-2xl transition-all duration-200",
            dimmed
              ? "border-white/5 bg-surface/70"
              : "border-white/15 bg-gradient-to-b from-[#1c1d22]/95 via-[#131418]/95 to-[#0b0c0e]/95 backdrop-blur-md hover:border-brand/80 hover:shadow-[0_0_25px_rgba(225,6,0,0.45)] hover:scale-105"
          )}
          whileHover={!dimmed ? { y: -6 } : undefined}
          transition={{ type: "spring", stiffness: 350, damping: 22 }}
        >
          {/* Lluentor superior d'estil cromo esportiu */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 rounded-t-2xl bg-gradient-to-b from-white/10 to-transparent" />

          {/* Contingut: Cara Principal (Front) o Detalls (Back) */}
          <AnimatePresence mode="wait">
            {!flipped ? (
              <motion.div
                key="front"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col justify-between"
              >
                {/* Capçalera del cromo: Dorsal + Badge de titular/suplent */}
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-black leading-none text-white/25">
                    {player.number}
                  </span>
                  <span
                    className={clsx(
                      "rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                      player.starter
                        ? "border border-brand/40 bg-brand/15 text-brand-light"
                        : "border border-white/10 bg-white/5 text-white/50"
                    )}
                  >
                    {player.starter ? "11" : "SUPL"}
                  </span>
                </div>

                {/* Avatar circular amb gradient roig/blau */}
                <div className="relative mx-auto my-0.5 flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-[#e10600]/35 via-[#1e3a8a]/35 to-black shadow-inner">
                  <span className="font-display text-base font-extrabold tracking-wider text-white">
                    {initials}
                  </span>
                  {/* Petit indicador de posició */}
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-[8px] font-bold text-white shadow">
                    {player.position[0]}
                  </span>
                </div>

                {/* Dades del jugador */}
                <div className="text-center">
                  <h4 className="font-display truncate text-[12px] font-bold text-white leading-tight">
                    {player.name}
                  </h4>
                  <p className="text-[8px] uppercase tracking-wider text-white/45">
                    {player.role || player.position}
                  </p>
                </div>

                {/* Peu de cromo oficial CF Juneda */}
                <div className="flex items-center justify-between border-t border-white/10 pt-1 text-[7px] font-bold uppercase tracking-widest text-white/35">
                  <span>CF JUNEDA</span>
                  <span className="text-brand">25/26</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="back"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-brand/30 pb-1">
                    <span className="font-display text-base font-bold text-brand">
                      #{player.number}
                    </span>
                    <span className="text-[8px] uppercase tracking-wider text-white/40">
                      {player.position}
                    </span>
                  </div>
                  <h5 className="font-display mt-1 text-[11px] font-bold text-white">
                    {player.name}
                  </h5>
                  <p className="mt-1 line-clamp-3 text-[8.5px] leading-relaxed text-white/65">
                    {player.bio || "Jugador del primer equip del CF Juneda per a la temporada 25/26."}
                  </p>
                </div>

                <div className="rounded-lg border border-white/5 bg-white/[0.03] p-1 text-center text-[7.5px] text-white/40">
                  Clica per girar
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </Html>
  );
}
