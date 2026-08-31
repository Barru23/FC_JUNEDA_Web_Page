"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { Player } from "@/lib/data";

export function PlayerCard({ player }: { player: Player }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <button
      onClick={() => setFlipped((f) => !f)}
      className="relative h-72 w-full [perspective:1200px]"
      aria-label={`Fitxa de ${player.name}`}
    >
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      >
        <div
          className="absolute inset-0 flex flex-col justify-end overflow-hidden rounded-xl border border-white/10 p-5 text-left backdrop-blur-sm transition-colors duration-300 hover:border-brand/50 [backface-visibility:hidden]"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,10,11,0) 30%, rgba(10,10,11,0.95) 92%), linear-gradient(135deg, #241416, #0c0c0d)",
          }}
        >
          <span className="absolute right-4 top-4 font-display text-4xl font-extrabold text-white/15">
            {player.number}
          </span>
          <h3 className="font-display text-lg font-bold">{player.name}</h3>
          <p className="text-xs uppercase tracking-wide text-white/50">{player.position}</p>
        </div>

        <div
          className="absolute inset-0 flex flex-col justify-center gap-3 rounded-xl border border-brand/40 bg-surface p-5 text-left [backface-visibility:hidden] [transform:rotateY(180deg)]"
        >
          <span className="font-display text-3xl font-extrabold text-brand">
            #{player.number}
          </span>
          <h3 className="font-display text-lg font-bold">{player.name}</h3>
          <p className="text-xs uppercase tracking-wide text-white/40">{player.position}</p>
          <p className="text-sm leading-relaxed text-white/60">{player.bio}</p>
        </div>
      </motion.div>
    </button>
  );
}
