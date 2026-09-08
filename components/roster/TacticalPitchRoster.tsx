"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import { SectionHeading } from "@/components/EventsSection";
import { PitchScene } from "./PitchScene";
import { PitchBoard } from "./PitchBoard";
import { FormationRow, FORMATION_CONFIG } from "./FormationRow";
import { StaffBench } from "./StaffBench";
import { CaptainsRow } from "./CaptainsRow";
import {
  getAllByPosition,
  getStaff,
  getCaptains,
  POSITIONS,
  type SquadPosition,
} from "@/lib/squad";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { motion, AnimatePresence } from "framer-motion";
import { Users, RotateCcw, Sparkles, LayoutGrid, Award } from "lucide-react";

type ActiveRow = SquadPosition | "Staff" | "Capitans" | "Tots" | null;

const CAPTAIN_ORDINALS = ["1r", "2n", "3r", "4t", "5è"];

export function TacticalPitchRoster() {
  const [activeRow, setActiveRow] = useState<ActiveRow>(null);
  // Starts as "list" regardless of device: WebGL is too heavy for most
  // phones, and defaulting to "3d" here would mount the Canvas (and
  // PitchBoard's 1536x1024 texture generation) for a mobile visitor for one
  // frame before the isMobile effect below corrects it back to "list". The
  // manual toggle further down still lets a mobile user opt back into 3D.
  const [viewMode, setViewMode] = useState<"3d" | "list">("list");
  const [detailedId, setDetailedId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const staffMembers = useMemo(() => getStaff(), []);
  const captains = useMemo(() => getCaptains(), []);
  const rowData = useMemo(() => {
    const entries = FORMATION_CONFIG.map((config) => [config.position, getAllByPosition(config.position)] as const);
    return Object.fromEntries(entries) as Record<SquadPosition, ReturnType<typeof getAllByPosition>>;
  }, []);

  useEffect(() => {
    setViewMode(isMobile ? "list" : "3d");
  }, [isMobile]);

  // Toggle: clicking the already-detailed card again closes it (mirrors the
  // click-to-open gesture in CromoMesh.tsx); clicking a different card opens
  // that one instead. Escape and clicking empty pitch space (Canvas's
  // onPointerMissed, wired below) both just clear it outright.
  const toggleDetail = (id: string) => {
    setDetailedId((cur) => (cur === id ? null : id));
  };

  // Every line/bench selector (the on-pitch buttons and the quick-select bar
  // share this) toggles that target on/off and drops any open detail card —
  // switching lines with a card enlarged would otherwise leave it floating
  // over the wrong formation.
  const toggleRow = (target: Exclude<ActiveRow, null>) => {
    setActiveRow((cur) => (cur === target ? null : target));
    setDetailedId(null);
  };
  const resetRows = () => {
    setActiveRow(null);
    setDetailedId(null);
  };

  useEffect(() => {
    if (detailedId === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailedId]);

  return (
    <section id="plantilla" className="relative z-10 px-4 py-20 md:px-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <SectionHeading label="Plantilla 26/27" title="Tactical 3D Pitch Roster" />
          <p className="max-w-xl text-sm leading-relaxed text-white/55">
            Camp tàctic horitzontal: porters, defenses, migcampistes i davanters
            d&apos;esquerra a dreta. Clica qualsevol línia o el cos tècnic per desplegar-la
            en ventall, o &quot;Tots els cromos&quot; per veure-ho tot alhora.
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
              onClick={resetRows}
              className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand-light hover:bg-brand/20 transition-colors"
            >
              <RotateCcw size={12} />
              Reiniciar Vista
            </button>
          )}
        </div>
      </div>

      {/* Botons selectors de posició ràpida */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button
          onClick={resetRows}
          className={`rounded-full border px-3.5 py-1.5 text-xs uppercase tracking-wide transition-all ${
            activeRow === null
              ? "border-brand bg-brand text-white shadow-[0_0_12px_rgba(225,6,0,0.4)]"
              : "border-white/10 bg-black/30 text-white/55 hover:border-white/25 hover:text-white"
          }`}
        >
          Vista per Línies
        </button>

        {POSITIONS.map((pos) => {
          const isCurrent = activeRow === pos;
          return (
            <button
              key={pos}
              onClick={() => toggleRow(pos)}
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
          onClick={() => toggleRow("Staff")}
          className={`rounded-full border px-3.5 py-1.5 text-xs uppercase tracking-wide transition-all ${
            activeRow === "Staff"
              ? "border-blue-500 bg-navy text-white shadow-[0_0_12px_rgba(30,58,138,0.5)]"
              : "border-white/10 bg-black/30 text-white/55 hover:border-blue-400/40 hover:text-white"
          }`}
        >
          Cos Tècnic
        </button>

        <button
          onClick={() => toggleRow("Capitans")}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs uppercase tracking-wide transition-all ${
            activeRow === "Capitans"
              ? "border-gold bg-gold text-black shadow-[0_0_12px_rgba(251,191,36,0.5)]"
              : "border-white/10 bg-black/30 text-white/55 hover:border-gold/40 hover:text-white"
          }`}
        >
          <Award size={12} />
          Capitans
        </button>

        <button
          onClick={() => toggleRow("Tots")}
          className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs uppercase tracking-wide transition-all ${
            activeRow === "Tots"
              ? "border-brand bg-brand text-white shadow-[0_0_12px_rgba(225,6,0,0.4)]"
              : "border-white/10 bg-black/30 text-white/55 hover:border-white/25 hover:text-white"
          }`}
        >
          <LayoutGrid size={12} />
          Tots els cromos
        </button>
      </div>

      {/* Semantic squad list for screen readers and crawlers — WebGL text
          (the 3D cromos, in either view mode) is invisible to both, so this
          stays in the DOM unconditionally rather than only in the mobile
          list fallback. */}
      <ul className="sr-only">
        {POSITIONS.map((pos) =>
          rowData[pos].map((p) => (
            <li key={p.id}>
              #{p.number} {p.name} — {p.position} · {p.town}
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
        <div className="relative mx-auto h-[620px] w-full max-w-[100rem] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#101217]/70 via-[#0a0a0d]/90 to-black p-1 shadow-2xl backdrop-blur-md sm:h-[680px] lg:h-[800px]">
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
            <PitchScene onBackgroundClick={() => setDetailedId(null)}>
              {/* Diorama 3D del camp de futbol */}
              <PitchBoard />

              {/* Fileres de la plantilla, per línia */}
              {FORMATION_CONFIG.map((config) => (
                <FormationRow
                  key={config.position}
                  config={config}
                  allPlayers={rowData[config.position]}
                  isActive={activeRow === config.position || activeRow === "Tots"}
                  isDimmed={activeRow !== null && activeRow !== "Tots" && activeRow !== config.position}
                  onToggleActive={() => toggleRow(config.position)}
                  detailedId={detailedId}
                  onToggleDetail={toggleDetail}
                />
              ))}

              {/* Cos tècnic centrat a la part superior del camp */}
              <StaffBench
                staff={staffMembers}
                isActive={activeRow === "Staff" || activeRow === "Tots"}
                isDimmed={activeRow !== null && activeRow !== "Tots" && activeRow !== "Staff"}
                onToggleActive={() => toggleRow("Staff")}
                detailedId={detailedId}
                onToggleDetail={toggleDetail}
              />

              {/* Alineació de capitans — només quan es selecciona explícitament
                  ("Tots" ja els mostra dins la seva pròpia línia, evitem duplicar-los) */}
              <CaptainsRow
                captains={captains}
                isActive={activeRow === "Capitans"}
                detailedId={detailedId}
                onToggleDetail={toggleDetail}
              />
            </PitchScene>
          </Suspense>

          {/* Badges flotants informatius a les cantonades */}
          <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/60 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
              <span>Camp Horitzontal 3D</span>
            </div>

            {activeRow && (
              <div className="flex items-center gap-1.5 rounded-xl border border-brand/30 bg-brand/20 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-md">
                <span>Focalitzat:</span>
                <span className="text-brand-light">{activeRow === "Tots" ? "Tots els cromos" : activeRow}</span>
              </div>
            )}

            {detailedId && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/70 px-3 py-2 text-[11px] font-semibold text-white/60 backdrop-blur-md">
                <span>Clica de nou, prem Esc o clica fora per tancar</span>
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute top-4 right-4 hidden items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40 backdrop-blur-md sm:flex">
            <Users size={13} className="text-brand" />
            <span>25 Jugadors · 5 Cos Tècnic</span>
          </div>
        </div>
      ) : (
        /* ── Fallback Llista Responsive per a Mòbil ── */
        <div className="space-y-4">
          {/* Cos tècnic en llista — a dalt, coherent amb la seva posició al camp 3D */}
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
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {staffMembers.map((s) => (
                      <div
                        key={s.id}
                        className="overflow-hidden rounded-xl border border-blue-500/15 bg-black/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.photo}
                          alt={`Cromo de ${s.name}`}
                          loading="lazy"
                          className="aspect-[512/698] w-full object-cover"
                        />
                        <div className="p-2">
                          <h4 className="truncate font-display text-xs font-bold text-white">{s.name}</h4>
                          <p className="truncate text-[9px] uppercase tracking-wider text-blue-300">{s.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Capitans en llista — mateix ordre (1r a 5è) que al camp 3D */}
          <div className="overflow-hidden rounded-2xl border border-gold/20 bg-surface/70 backdrop-blur-md">
            <button
              onClick={() => setActiveRow(activeRow === "Capitans" ? null : "Capitans")}
              className="flex w-full items-center justify-between p-4 text-left font-display text-lg font-bold text-white hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-gold" />
                <span>Capitans</span>
              </div>
              <span className="text-xs uppercase tracking-wider text-white/40">
                {captains.length} capitans
              </span>
            </button>

            <AnimatePresence>
              {activeRow === "Capitans" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5 p-4"
                >
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {captains.map((c, i) => (
                      <div
                        key={c.id}
                        className="overflow-hidden rounded-xl border border-gold/15 bg-black/40"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.photo}
                          alt={`Cromo de ${c.name}`}
                          loading="lazy"
                          className="aspect-[512/698] w-full object-cover"
                        />
                        <div className="p-2">
                          <h4 className="truncate font-display text-xs font-bold text-white">{c.name}</h4>
                          <p className="truncate text-[9px] uppercase tracking-wider text-gold">
                            {CAPTAIN_ORDINALS[i] ?? `${i + 1}è`} Capità
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {POSITIONS.map((pos) => {
            const players = rowData[pos];
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
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {players.map((p) => (
                          <div
                            key={p.id}
                            className="overflow-hidden rounded-xl border border-white/5 bg-black/40"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.photo}
                              alt={`Cromo de ${p.name}`}
                              loading="lazy"
                              className="aspect-[512/698] w-full object-cover"
                            />
                            <div className="flex items-center gap-1.5 p-2">
                              <span className="font-display text-sm font-extrabold text-brand">#{p.number}</span>
                              <h4 className="truncate font-display text-xs font-bold text-white">{p.name}</h4>
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
        </div>
      )}
    </section>
  );
}
