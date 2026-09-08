"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export function Hero() {
  return (
    <section className="relative min-h-[92svh] overflow-hidden px-6 pb-24 pt-16 md:px-10 md:pt-20">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } }}
        className="relative z-10 grid grid-cols-1 items-center gap-8 md:grid-cols-[auto_1fr] lg:grid-cols-[440px_1fr] xl:grid-cols-[480px_1fr] md:gap-6 lg:gap-8"
      >
        <div className="flex flex-col gap-8 max-w-md">
          <motion.div
            variants={reveal}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-wrap-pretty font-display text-[13vw] font-extrabold uppercase leading-[0.92] tracking-tight sm:text-6xl md:text-[3.6rem] lg:text-[4.4rem]">
              Club
              <br />
              Futbol
              <br />
              <span className="text-brand">Juneda</span>
            </h1>
          </motion.div>

          <motion.p
            variants={reveal}
            transition={{ duration: 0.6 }}
            className="text-base leading-relaxed text-white/55"
          >
            Temporada 26/27. Viu cada partit, uneix-te a la campanya de socis i
            vesteix els colors de sempre — Som-hi Rojos!
          </motion.p>

          <div className="flex flex-wrap items-center gap-3">
            <motion.a
              variants={reveal}
              transition={{ duration: 0.6 }}
              href="#socis"
              className="flex items-center gap-2 rounded-full border border-brand bg-brand px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-white transition-all duration-300 hover:scale-[1.02] hover:ring-2 hover:ring-brand hover:ring-offset-2 hover:ring-offset-carbon"
            >
              Fes-te soci 26/27 <ArrowRight size={14} />
            </motion.a>
            <motion.a
              variants={reveal}
              transition={{ duration: 0.6 }}
              href="#botiga"
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-white/75 transition-all hover:border-white/30 hover:text-white"
            >
              Botiga oficial <ArrowRight size={14} />
            </motion.a>
          </div>
        </div>

        <motion.div
          variants={reveal}
          transition={{ duration: 0.7 }}
          className="relative flex items-center justify-center md:justify-end w-full"
        >
          <div className="relative aspect-[16/11] w-full max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-[760px] -rotate-1 overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-[0_0_80px_rgba(225,6,0,0.25)] transition-transform duration-500 hover:rotate-0">
            <Image
              src="/data/players/plantilla-team.jpg"
              alt="Plantilla oficial del CF Juneda Temporada 26/27"
              fill
              sizes="(max-width: 768px) 95vw, (max-width: 1200px) 680px, 780px"
              style={{ objectFit: "cover", objectPosition: "center 48%" }}
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,10,11,0.3) 0%, transparent 20%, transparent 60%, rgba(10,10,11,0.92) 100%), radial-gradient(ellipse at center, transparent 40%, rgba(10,10,11,0.55) 95%)",
              }}
            />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
              <div className="flex flex-col">
                <span className="w-fit rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand backdrop-blur-md">
                  1r Equip · 26/27
                </span>
                <span className="mt-1 font-display text-xl font-extrabold uppercase tracking-tight text-white drop-shadow-md">
                  Plantilla Oficial
                </span>
              </div>
              <span className="rounded-full border border-white/20 bg-brand/80 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(225,6,0,0.5)] backdrop-blur-md">
                SOMHIROJOS
              </span>
            </div>
          </div>

          {/* Floating stat card — desktop only; on mobile this would sit on
              top of the team photo, so it moves into a compact row below it
              instead (see the mobile-only block right after this grid). */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="absolute -top-6 right-0 hidden w-56 flex-col gap-2 rounded-2xl border border-white/10 bg-black/70 p-5 backdrop-blur-xl md:-right-6 md:flex"
          >
            <span className="font-display text-xl font-black uppercase tracking-tight text-white">
              Segona Catalana
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
              Grup 5
            </span>
            <div className="mt-1 border-t border-white/10 pt-3">
              <span className="block text-sm font-semibold text-white">
                Diumenge · 17:00 h
              </span>
              <span className="text-[11px] uppercase tracking-[0.08em] text-white/50">
                Camp Municipal de Juneda
              </span>
            </div>
          </motion.div>

          {/* Floating social pill — desktop only, same reason as above */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
            className="absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-full border border-white/10 bg-black/70 py-2 pl-2 pr-5 backdrop-blur-xl md:-left-8 md:flex"
          >
            <div className="flex -space-x-2">
              <span
                className="h-7 w-7 rounded-full border-2 border-carbon"
                style={{ background: "#1E3A8A" }}
              />
              <span
                className="h-7 w-7 rounded-full border-2 border-carbon"
                style={{ background: "#E10600" }}
              />
            </div>
            <span className="text-[11px] font-medium leading-tight text-white/75">
              Campanya de socis oberta
              <br />
              <span className="font-bold text-brand">Fes-te soci 2026/27</span>
            </span>
          </motion.div>
        </motion.div>

        {/* Mobile-only: same info as the two floating cards above, but
            flowing below the photo instead of overlapping it */}
        <motion.div
          variants={reveal}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-3 md:hidden"
        >
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/50 px-4 py-3">
            <div>
              <span className="font-display text-sm font-black uppercase tracking-tight text-white">
                Segona Catalana <span className="text-brand">· Grup 5</span>
              </span>
              <span className="mt-0.5 block text-[11px] text-white/50">
                Diumenge · 17:00 h · Camp Municipal de Juneda
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/50 py-2 pl-2 pr-5">
            <div className="flex -space-x-2">
              <span
                className="h-7 w-7 shrink-0 rounded-full border-2 border-carbon"
                style={{ background: "#1E3A8A" }}
              />
              <span
                className="h-7 w-7 shrink-0 rounded-full border-2 border-carbon"
                style={{ background: "#E10600" }}
              />
            </div>
            <span className="text-[11px] font-medium leading-tight text-white/75">
              Campanya de socis oberta ·{" "}
              <span className="font-bold text-brand">Fes-te soci 2026/27</span>
            </span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
