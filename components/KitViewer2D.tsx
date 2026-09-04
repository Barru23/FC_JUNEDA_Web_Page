"use client";

import Image from "next/image";
import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────
   KitViewer2D — front/back studio photo viewer
   Real product photography (see scripts/optimize-
   kit-photos.mjs), so front/back is a crossfade
   between angles of the same mannequin rather than
   a flipping card — that suits flat vector art, not
   a lit, shadowed photo.
   ───────────────────────────────────────────── */

type ViewSide = "front" | "back";

interface KitViewer2DProps {
  view: ViewSide;
  onViewChange: (view: ViewSide) => void;
}

export function KitViewer2D({ view, onViewChange }: KitViewer2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);

  /* ── Drag / swipe to flip ── */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      const deltaX = e.clientX - dragStartX.current;
      const threshold = 50; // px needed to trigger flip
      if (Math.abs(deltaX) > threshold) {
        onViewChange(view === "front" ? "back" : "front");
      }
    },
    [view, onViewChange]
  );

  const handlePointerCancel = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div className="relative flex flex-col gap-4">
      {/* ── Image viewer container ── */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative h-[450px] w-full cursor-grab overflow-hidden rounded-2xl border border-black/10 bg-white select-none active:cursor-grabbing sm:h-[550px]"
      >
        <AnimatePresence mode="wait">
          {view === "front" ? (
            <motion.div
              key="front"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="relative h-[92%] w-auto aspect-[1856/2274]">
                <Image
                  src="/data/kit-front.jpg"
                  alt="Samarreta CF Juneda — Davant"
                  fill
                  sizes="(max-width: 768px) 90vw, 45vw"
                  className="object-contain drop-shadow-[0_8px_30px_rgba(225,6,0,0.3)]"
                  priority
                  draggable={false}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="back"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="relative h-[92%] w-auto aspect-[1856/2274]">
                <Image
                  src="/data/kit-back.jpg"
                  alt="Samarreta CF Juneda — Darrere"
                  fill
                  sizes="(max-width: 768px) 90vw, 45vw"
                  className="object-contain drop-shadow-[0_8px_30px_rgba(225,6,0,0.3)]"
                  priority
                  draggable={false}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── View selector buttons ── */}
      <div className="flex justify-center gap-2">
        {(["front", "back"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`rounded-xl border px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
              view === v
                ? "border-brand bg-brand text-white shadow-[0_0_12px_rgba(225,6,0,0.4)]"
                : "border-white/10 bg-black/40 text-white/60 hover:border-white/30 hover:text-white"
            }`}
          >
            {v === "front" ? "Davant" : "Darrere"}
          </button>
        ))}
      </div>
    </div>
  );
}
