"use client";

import { useState } from "react";
import { players, type Position } from "@/lib/data";
import { PlayerCard } from "./PlayerCard";
import { SectionHeading } from "./EventsSection";

const POSITIONS: (Position | "Tots")[] = [
  "Tots",
  "Porters",
  "Defenses",
  "Migcampistes",
  "Davanters",
  "Cos Tècnic",
];

export function RosterSection() {
  const [filter, setFilter] = useState<Position | "Tots">("Tots");

  const filtered = players.filter((p) => filter === "Tots" || p.position === filter);

  return (
    <section id="plantilla" className="relative z-10 px-6 py-20 md:px-10">
      <SectionHeading label="Plantilla" title="Els Nostres Jugadors" />

      <div className="mb-8 flex flex-wrap gap-2">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            onClick={() => setFilter(pos)}
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-wide ${
              filter === pos
                ? "border-brand bg-brand text-white"
                : "border-white/15 text-white/55 hover:border-white/35"
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </section>
  );
}
