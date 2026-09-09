"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Crest } from "./Crest";
import { Modal } from "@/components/ui/Modal";
import { restoreScrollTo } from "@/lib/hooks/useScrollLock";

const LINKS = [
  { href: "#calendari", label: "Calendari" },
  { href: "#botiga", label: "Botiga" },
  { href: "#esdeveniments", label: "Esdeveniments" },
  { href: "#socis", label: "Fes-te Soci" },
  { href: "#plantilla", label: "Plantilla" },
];

export function Nav({ crestRevealed }: { crestRevealed: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // No fem preventDefault: deixem que l'enllac posi el "#seccio" a la URL, que
  // es el que dona una entrada d'historial i un enllac compartible. L'unic que
  // cal es dir al bloqueig d'scroll on ha de deixar la pagina quan el menu es
  // tanqui, perque mentre esta obert el navegador no pot desplacar-se sol.
  function anarASeccio(href: string) {
    const seccio = document.querySelector(href);
    if (seccio) restoreScrollTo(seccio);
    setMenuOpen(false);
  }

  return (
    <header className="relative z-40 flex items-center justify-between px-6 py-5 md:px-10">
      <button
        onClick={() => setMenuOpen(true)}
        className="flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-2.5 backdrop-blur-sm transition-colors hover:border-white/25"
        aria-label="Obrir menú"
      >
        <Menu size={16} className="text-white/80" />
        <span className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60 sm:inline">
          Temporada 26/27 — Segona Catalana G5
        </span>
      </button>

      <motion.div
        layoutId="crest"
        className="absolute left-1/2 top-1/2 h-[48px] w-[33px] -translate-x-1/2 -translate-y-1/2"
        animate={{ opacity: crestRevealed ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <Crest className="h-full w-full drop-shadow-[0_0_16px_rgba(225,6,0,0.5)]" />
      </motion.div>

      <AnimatePresence>
        {menuOpen && (
          <Modal onClose={() => setMenuOpen(false)} ariaLabel="Menú de navegació">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-black/95 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between px-6 py-5 md:px-10">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                CF Juneda
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Tancar menú"
                className="rounded-full border border-white/10 p-2.5 text-white/70 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col items-start justify-center gap-2 px-8 py-8 md:px-16">
              {LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => anarASeccio(link.href)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.4 }}
                  className="font-display text-4xl font-extrabold uppercase tracking-tight text-white/85 transition-colors hover:text-brand sm:text-5xl md:text-7xl"
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>
          </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </header>
  );
}
