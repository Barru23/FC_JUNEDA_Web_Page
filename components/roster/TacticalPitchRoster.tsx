"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import { SectionHeading } from "@/components/EventsSection";
import { PitchScene } from "./PitchScene";
import { PitchBoard } from "./PitchBoard";
import { FormationRow, FORMATION_CONFIG } from "./FormationRow";
import { StaffBench } from "./StaffBench";
import {
  getStartersByPosition,
  getAllByPosition,
  getStaff,
  POSITIONS,
  type SquadPosition,
} from "@/lib/squad";
import { motion, AnimatePresence } from "framer-motion";
import { Users, RotateCcw, Sparkles } from "lucide-react";

type ActiveRow = SquadPosition | "Staff" | null;

/**
 * Hook lleuger per detectar si estem en pantalla petita (mòbil)
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();

    let frame: number | null = null;
    const onResize = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        check();
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return isMobile;
}

export function TacticalPitchRoster() {
  const [activeRow, setActiveRow] = useState<ActiveRow>(null);
  const [viewMode, setViewMode] = useState<"3d" | "list">("3d");
  const isMobile = useIsMobile();
  const staffMembers = useMemo(() => getStaff(), []);
  const rowData = useMemo(() => {
    const entries = FORMATION_CONFIG.map((config) => [
      config.position,
      { starters: getStartersByPosition(config.position), all: getAllByPosition(config.position) },
    ] as const);
    return Object.fromEntries(entries) as Record<SquadPosition, { starters: ReturnType<typeof getAllByPosition>; all: ReturnType<typeof getAllByPosition> }>;
  }, []);

  // WebGL is too heavy for most phones — force the 2D list on mobile.
  // The manual toggle below still lets a mobile user opt back into 3D.
  useEffect(() => {
    if (isMobile) setViewMode("list");
  }, [isMobile]);

  return (
    <section id="plantilla" className="relative z-10 px-4 py-20 md:px-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <SectionHeading label="Plantilla 25/26" title="Tactical 3D Pitch Roster" />
          <p className="max-w-xl text-sm leading-relaxed text-white/55">
            Camp tàctic en perspectiva isomètrica (4-3-3). Passa el ratolí per qualsevol
            línia o per la banqueta per desplegar la plantilla completa en ventall.
          </p>
        </div>

        {/* Controls ràpids de filtre / mode */}
        <div className="flex flex-wrap items-center gap-2">
          {isMobile && (
            <button
              onClick={() => setViewMode(viewMode === "3d" ? "list" : "3d")}
              className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white"
            >
              <Sparkles size={13} className="text-brand" />
              {viewMode === "3d" ? "Veure Llista" : "Veure Camp 3D"}
            </button>
          )}

          {activeRow && (
            <button
              onClick={() => setActiveRow(null)}
              className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand-light hover:bg-brand/20 transition-colors"
            >
              <RotateCcw size={12} />
              Reiniciar Vista 4-3-3
            </button>
          )}
        </div>
      </div>

      {/* Botons selectors de posició ràpida */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveRow(null)}
          className={`rounded-full border px-3.5 py-1.5 text-xs uppercase tracking-wide transition-all ${
            activeRow === null
              ? "border-brand bg-brand text-white shadow-[0_0_12px_rgba(225,6,0,0.4)]"
              : "border-white/10 bg-black/30 text-white/55 hover:border-white/25 hover:text-white"
          }`}
        >
          11 Titulars (4-3-3)
        </button>

        {POSITIONS.map((pos) => {
          const isCurrent = activeRow === pos;
          return (
            <button
              key={pos}
              onClick={() => setActiveRow(isCurrent ? null : pos)}
              className={`rounded-full border px-3.5 py-1.5 text-xs uppercase tracking-wide transition-all ${
                isCurrent
                  ? "border-brand bg-brand text-white shadow-[0_0_12px_rgba(225,6,0,0.4)]"
                  : "border-white/10 bg-black/30 text-white/55 hover:border-white/25 hover:text-white"
              }`}
            >
              {pos}
            </button>
          );
        })}

        <button
          onClick={() => setActiveRow(activeRow === "Staff" ? null : "Staff")}
          className={`rounded-full border px-3.5 py-1.5 text-xs uppercase tracking-wide transition-all ${
            activeRow === "Staff"
              ? "border-blue-500 bg-navy text-white shadow-[0_0_12px_rgba(30,58,138,0.5)]"
              : "border-white/10 bg-black/30 text-white/55 hover:border-blue-400/40 hover:text-white"
          }`}
        >
          Cos Tècnic
        </button>
      </div>

      {/* Semantic squad list for screen readers and crawlers — WebGL text
          (the 3D cromos, in either view mode) is invisible to both, so this
          stays in the DOM unconditionally rather than only in the mobile
          list fallback. */}
      <ul className="sr-only">
        {POSITIONS.map((pos) =>
          rowData[pos].all.map((p) => (
            <li key={p.id}>
              #{p.number} {p.name} — {p.role || p.position} ({p.starter ? "Titular" : "Suplent"})
            </li>
          ))
        )}
        {staffMembers.map((s) => (
          <li key={s.id}>
            {s.name} — {s.role}
          </li>
        ))}
      </ul>

      {/* ── Mode Camp 3D Principal ── */}
      {viewMode === "3d" ? (
        <div className="relative mx-auto h-[620px] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#101217]/70 via-[#0a0a0d]/90 to-black p-1 shadow-2xl backdrop-blur-md sm:h-[680px] lg:h-[750px]">
          <Suspense
            fallback={
              <div className="flex h-full w-full flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" />
                <span className="font-display text-xs font-bold uppercase tracking-widest text-white/60">
                  Carregant Camp Tàctic 3D...
                </span>
              </div>
            }
          >
            <PitchScene>
              {/* Diorama 3D del camp de futbol */}
              <PitchBoard />

              {/* Fileres de la formació 4-3-3 */}
              {FORMATION_CONFIG.map((config) => (
                <FormationRow
                  key={config.position}
                  config={config}
                  starters={rowData[config.position].starters}
                  allPlayers={rowData[config.position].all}
                  isActive={activeRow === config.position}
                  isDimmed={activeRow !== null && activeRow !== config.position}
                  onActivate={() => setActiveRow(config.position)}
                  onDeactivate={() => setActiveRow((cur) => (cur === config.position ? null : cur))}
                />
              ))}

              {/* Banqueta lateral del staff */}
              <StaffBench
                staff={staffMembers}
                isActive={activeRow === "Staff"}
                isDimmed={activeRow !== null && activeRow !== "Staff"}
                onActivate={() => setActiveRow("Staff")}
                onDeactivate={() => setActiveRow((cur) => (cur === "Staff" ? null : cur))}
              />
            </PitchScene>
          </Suspense>

          {/* Badges flotants informatius a les cantonades */}
          <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/60 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
              <span>Perspectiva Isomètrica 3D</span>
            </div>

            {activeRow && (
              <div className="flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand/20 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-md">
                <span>Focalitzat:</span>
                <span className="text-brand-light">{activeRow}</span>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute top-4 right-4 hidden items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40 backdrop-blur-md sm:flex">
            <Users size={13} className="text-brand" />
            <span>22 Jugadors · 4 Cos Tècnic</span>
          </div>
        </div>
      ) : (
        /* ── Fallback Llista Responsive per a Mòbil ── */
        <div className="space-y-4">
          {POSITIONS.map((pos) => {
            const players = rowData[pos].all;
            const isExpanded = activeRow === pos;

            return (
              <div
                key={pos}
                className="overflow-hidden rounded-2xl border border-white/10 bg-surface/70 backdrop-blur-md"
              >
                <button
                  onClick={() => setActiveRow(activeRow === pos ? null : pos)}
                  className="flex w-full items-center justify-between p-4 text-left font-display text-lg font-bold text-white hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                    <span>{pos}</span>
                  </div>
                  <span className="text-xs uppercase tracking-wider text-white/40">
                    {players.length} jugadors
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5 p-4"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {players.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/40 p-3"
                          >
                            <span className="font-display text-2xl font-extrabold text-brand">
                              #{p.number}
                            </span>
                            <div>
                              <h4 className="font-display text-sm font-bold text-white">
                                {p.name}
                              </h4>
                              <p className="text-[10px] uppercase tracking-wider text-white/40">
                                {p.role || p.position} · {p.starter ? "Titular" : "Suplent"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* Cos tècnic en llista */}
          <div className="overflow-hidden rounded-2xl border border-blue-500/20 bg-surface/70 backdrop-blur-md">
            <button
              onClick={() => setActiveRow(activeRow === "Staff" ? null : "Staff")}
              className="flex w-full items-center justify-between p-4 text-left font-display text-lg font-bold text-white hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span>Cos Tècnic</span>
              </div>
              <span className="text-xs uppercase tracking-wider text-white/40">
                {staffMembers.length} membres
              </span>
            </button>

            <AnimatePresence>
              {activeRow === "Staff" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5 p-4"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {staffMembers.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 rounded-xl border border-blue-500/15 bg-black/40 p-3"
                      >
                        <span className="text-xl">📋</span>
                        <div>
                          <h4 className="font-display text-sm font-bold text-white">
                            {s.name}
                          </h4>
                          <p className="text-[10px] uppercase tracking-wider text-blue-300">
                            {s.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </section>
  );
}
