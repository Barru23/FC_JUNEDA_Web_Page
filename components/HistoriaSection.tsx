"use client";

import { motion } from "framer-motion";
import { SectionHeading } from "./EventsSection";

export function HistoriaSection() {
  return (
    <section id="historia" className="relative z-10 px-6 py-20 md:px-10">
      <SectionHeading label="Història i Socis" title="Dècades Vestint de Roig" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">
            [ANY DE FUNDACIÓ]
          </span>
          <p className="text-base leading-relaxed text-white/60">
            El Club Futbol Juneda és des de fa generacions un punt de trobada
            del poble: futbol de base, primer equip a Segona Catalana i una
            afició que no falla ni a casa ni a fora. Aquest espai explicarà la
            història completa del club — anys de fundació, títols i moments
            que han marcat l&apos;entitat.
          </p>
          <p className="text-xs uppercase tracking-[0.1em] text-white/30">
            Contingut d&apos;exemple — pendent de material real del club.
          </p>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-brand/30 bg-brand/[0.06] p-7 backdrop-blur-sm">
          <div className="flex flex-col gap-2">
            <span className="font-display text-3xl font-extrabold text-white">Fes-te soci</span>
            <p className="text-sm leading-relaxed text-white/55">
              Suma&apos;t als seguidors i socis del club i viu la temporada des
              de dins.
            </p>
          </div>
          <button className="rounded-full bg-brand py-3 text-sm font-semibold uppercase tracking-wide text-white transition-transform hover:scale-[1.01]">
            Vull ser soci
          </button>
        </div>
      </motion.div>
    </section>
  );
}
