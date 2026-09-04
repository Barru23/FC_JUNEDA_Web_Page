"use client";

import { motion } from "framer-motion";
import { ShoppingBag, CalendarDays, HeartHandshake, Users, ArrowUpRight } from "lucide-react";

const TILES = [
  {
    href: "#botiga",
    icon: ShoppingBag,
    title: "Botiga Oficial",
    copy: "Equipació 26/27 amb personalització de dorsal.",
  },
  {
    href: "#esdeveniments",
    icon: CalendarDays,
    title: "Esdeveniments i Dinars",
    copy: "Reserva la teva plaça als sopars i dinars de temporada del club.",
  },
  {
    href: "#socis",
    icon: HeartHandshake,
    title: "Fes-te Soci",
    copy: "Suma't als seguidors i socis del club i viu la temporada des de dins.",
  },
  {
    href: "#plantilla",
    icon: Users,
    title: "Plantilla 1r Equip",
    copy: "Coneix la plantilla i el cos tècnic, posició a posició.",
  },
];

export function BentoGrid() {
  return (
    <section className="relative z-10 px-6 py-16 md:px-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((tile, i) => (
          <motion.a
            key={tile.href}
            href={tile.href}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm transition-all duration-300 hover:border-brand/60 hover:shadow-[0_0_36px_rgba(225,6,0,0.28)]"
          >
            <div className="flex items-center justify-between">
              <tile.icon size={22} className="text-brand" />
              <ArrowUpRight
                size={16}
                className="text-white/30 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/70"
              />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-display text-xl font-bold text-white">{tile.title}</h3>
              <p className="text-sm leading-relaxed text-white/50">{tile.copy}</p>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
