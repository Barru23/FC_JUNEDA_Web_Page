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
    <section className="relative min-h-[92vh] overflow-hidden px-6 pb-24 pt-16 md:px-10 md:pt-20">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } }}
        className="relative z-10 grid grid-cols-1 gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-4"
      >
        <div className="flex flex-col gap-8">
          <motion.div
            variants={reveal}
            transition={{ duration: 0.6 }}
            className="flex items-start gap-5"
          >
            <h1 className="text-wrap-pretty font-display text-[13vw] font-extrabold uppercase leading-[0.92] tracking-tight sm:text-6xl md:text-[3.6rem] lg:text-[4.4rem]">
              Passions que
              <br />
              batega<span className="text-brand">n</span> en
              <br />
              roig i blau
            </h1>

            <a
              href="#botiga"
              aria-label="Compra tiquet"
              className="group relative mt-2 hidden h-24 w-24 shrink-0 items-center justify-center rounded-full bg-brand shadow-[0_0_50px_rgba(225,6,0,0.55)] transition-transform hover:scale-105 sm:flex"
            >
              <span className="absolute inset-0 rounded-full border border-white/30" />
              <span className="flex flex-col items-center gap-1 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-white">
                Compra
                <br />
                tiquet
                <ArrowRight size={14} className="mt-1 transition-transform group-hover:translate-x-1" />
              </span>
            </a>
          </motion.div>

          <motion.p
            variants={reveal}
            transition={{ duration: 0.6 }}
            className="max-w-sm text-base leading-relaxed text-white/55"
          >
            Temporada 25/26. Viu cada partit, reserva els sopars del club i
            vesteix els colors de sempre — Som-hi Rojos!
          </motion.p>

          <motion.a
            variants={reveal}
            transition={{ duration: 0.6 }}
            href="#botiga"
            className="flex w-fit items-center gap-2 rounded-full bg-brand px-6 py-3.5 text-xs font-bold uppercase tracking-wide text-white sm:hidden"
          >
            Compra tiquet <ArrowRight size={14} />
          </motion.a>
        </div>

        <motion.div
          variants={reveal}
          transition={{ duration: 0.7 }}
          className="relative flex items-center justify-center"
        >
          <div className="relative aspect-[4/5] w-full max-w-md -rotate-2 overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-[0_0_80px_rgba(225,6,0,0.22)]">
            <Image
              src="/data/Samarretes.jpeg"
              alt="1a Equipació oficial del CF Juneda"
              fill
              sizes="(max-width: 768px) 90vw, 420px"
              style={{ objectFit: "cover", objectPosition: "20% 30%" }}
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 8%, rgba(10,10,11,0.72) 45%, rgba(10,10,11,0.97) 78%), linear-gradient(0deg, rgba(10,10,11,0.95), transparent 30%), linear-gradient(180deg, rgba(10,10,11,0.7), transparent 25%)",
              }}
            />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
              <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white/70 backdrop-blur-sm">
                1a Equipació 25/26
              </span>
              <span className="font-display text-2xl font-extrabold text-white/90">
                39,90 €
              </span>
            </div>
          </div>

          {/* Floating stat card */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="absolute -top-6 right-0 flex w-52 flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl md:-right-6"
          >
            <span className="font-display text-3xl font-extrabold text-white">
              +1.200
            </span>
            <span className="text-[11px] uppercase tracking-[0.08em] text-white/45">
              Seguidors i socis
            </span>
            <div className="mt-1 border-t border-white/10 pt-3">
              <span className="block text-sm font-semibold text-white">
                Diumenge · 17:00 h
              </span>
              <span className="text-[11px] uppercase tracking-[0.08em] text-white/45">
                Pròxim partit — Camp Municipal
              </span>
            </div>
          </motion.div>

          {/* Floating social pill */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.6 }}
            className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-full border border-white/10 bg-black/50 py-2 pl-2 pr-5 backdrop-blur-xl md:-left-8"
          >
            <div className="flex -space-x-3">
              {["#E10600", "#FBBF24", "#1E3A8A", "#DC2626"].map((color, i) => (
                <span
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-carbon"
                  style={{ background: color }}
                />
              ))}
            </div>
            <span className="text-[11px] font-medium leading-tight text-white/70">
              Més de 200 tiquets venuts
              <br />
              pel proper sopar
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
