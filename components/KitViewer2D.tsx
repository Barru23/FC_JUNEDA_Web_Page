"use client";

import Image from "next/image";
import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────
   KitViewer2D — Interactive 360° Image Viewer
   Pure React + Tailwind + Framer Motion
   ───────────────────────────────────────────── */

type ViewSide = "front" | "back";

interface KitViewer2DProps {
  view: ViewSide;
  onViewChange: (view: ViewSide) => void;
  name: string;
  number: string;
  customize: boolean;
}

export function KitViewer2D({
  view,
  onViewChange,
  name,
  number,
  customize,
}: KitViewer2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const isDragging = useRef(false);

  /* ── Drag / Swipe to rotate ── */
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

  /* ── Personalisation overlay values ── */
  const displayName = customize && name ? name.toUpperCase() : "";
  const displayNumber = customize && number ? number : "";

  return (
    <div className="relative flex flex-col gap-4">
      {/* ── Image Viewer Container ── */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative h-[450px] w-full cursor-grab overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-black/60 via-black/40 to-black/60 backdrop-blur-sm select-none active:cursor-grabbing sm:h-[550px]"
        style={{ perspective: "1200px" }}
      >
        <AnimatePresence mode="wait">
          {view === "front" ? (
            <motion.div
              key="front"
              className="absolute inset-0 flex items-center justify-center"
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="relative h-[85%] w-auto aspect-[3/4]">
                <Image
                  src="/data/jersey_front.png"
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
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="relative h-[85%] w-auto aspect-[3/4]">
                <Image
                  src="/data/jersey_back.png"
                  alt="Samarreta CF Juneda — Darrere"
                  fill
                  sizes="(max-width: 768px) 90vw, 45vw"
                  className="object-contain drop-shadow-[0_8px_30px_rgba(225,6,0,0.3)]"
                  priority
                  draggable={false}
                />

                {/* ── Dynamic dorsal overlay ── */}
                {customize && (displayName || displayNumber) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {/* Name — positioned above the number zone */}
                    {displayName && (
                      <span
                        className="font-display text-white font-extrabold tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
                        style={{
                          fontSize: "clamp(1rem, 4vw, 1.6rem)",
                          marginTop: "-12%",
                          textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                        }}
                      >
                        {displayName}
                      </span>
                    )}
                    {/* Number — large, centered */}
                    {displayNumber && (
                      <span
                        className="font-display text-white font-black tracking-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]"
                        style={{
                          fontSize: "clamp(3rem, 12vw, 6.5rem)",
                          lineHeight: 1,
                          marginTop: displayName ? "0.1em" : "-5%",
                          textShadow:
                            "0 0 20px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.6)",
                        }}
                      >
                        {displayNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Drag hint indicator ── */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full border border-white/5 bg-black/50 px-3 py-1.5 backdrop-blur-md">
          <svg
            className="h-3.5 w-3.5 text-white/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7l-4 5 4 5M16 7l4 5-4 5"
            />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Arrossega per girar
          </span>
        </div>
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
