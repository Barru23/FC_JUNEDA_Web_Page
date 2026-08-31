"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { Crest } from "./Crest";

const HOLD_MS = 1900;

export function Loader({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const t = setTimeout(onComplete, HOLD_MS);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black"
      exit={{ opacity: 0, transition: { duration: 0.6, ease: "easeInOut" } }}
    >
      <div className="pointer-events-none absolute -inset-[20%] blur-[60px] opacity-80">
        <div
          className="animate-drift1 absolute left-[18%] top-[20%] h-[420px] w-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 40% 40%, rgba(225,6,0,0.55), rgba(225,6,0,0) 70%)",
          }}
        />
        <div
          className="animate-drift2 absolute right-[15%] top-[35%] h-[340px] w-[340px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 60% 60%, rgba(220,38,38,0.45), rgba(220,38,38,0) 70%)",
          }}
        />
        <div
          className="animate-drift3 absolute bottom-[8%] left-[40%] h-[480px] w-[480px] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(30,58,138,0.35), rgba(30,58,138,0) 70%)",
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 40%, #000 90%)",
        }}
      />

      <motion.div
        layoutId="crest"
        className="relative z-10 h-[120px] w-[103px]"
        animate={{ scale: [1, 1.035, 1] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Crest className="h-full w-full drop-shadow-[0_0_28px_rgba(225,6,0,0.6)]" />
      </motion.div>

      <div className="absolute bottom-10 left-0 right-0 z-10 text-center text-[11px] uppercase tracking-[0.14em] text-white/30">
        Club Futbol Juneda
      </div>
    </motion.div>
  );
}
