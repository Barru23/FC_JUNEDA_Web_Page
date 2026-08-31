"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { X } from "lucide-react";
import type { ClubEvent } from "@/lib/data";

const DIETARY_OPTIONS = [
  "Cap intolerància",
  "Vegetarià",
  "Vegà",
  "Sense gluten",
  "Sense làctics",
];

export function BookingDrawer({
  event,
  onClose,
}: {
  event: ClubEvent;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [quantity, setQuantity] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [dietary, setDietary] = useState(DIETARY_OPTIONS[0]);

  const total = (quantity * event.price).toFixed(2);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-6 border-l border-white/10 bg-surface p-8"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-brand">Reserva</p>
            <h3 className="font-display text-2xl font-bold">{event.title}</h3>
            <p className="mt-1 text-sm text-white/50">
              {event.date} · {event.location}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tancar"
            className="rounded-full border border-white/10 p-2 text-white/60 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 text-[11px] uppercase tracking-[0.1em] text-white/40">
          <span className={step >= 1 ? "text-brand" : ""}>1. Tiquets</span>
          <span>—</span>
          <span className={step >= 2 ? "text-brand" : ""}>2. Dietètica</span>
          <span>—</span>
          <span className={step >= 3 ? "text-brand" : ""}>3. Confirmació</span>
        </div>

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <Field label="Nom del convidat">
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Nom i cognoms"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </Field>
            <Field label="Quantitat de tiquets">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="h-9 w-9 rounded-full border border-white/15 text-lg"
                >
                  −
                </button>
                <span className="font-display text-lg font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(event.spotsLeft, q + 1))}
                  className="h-9 w-9 rounded-full border border-white/15 text-lg"
                >
                  +
                </button>
                <span className="ml-auto text-xs text-white/40">
                  {event.spotsLeft} places disponibles
                </span>
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <Field label="Requeriments dietètics">
            <div className="flex flex-col gap-2">
              {DIETARY_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                    dietary === opt
                      ? "border-brand bg-brand/10"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <input
                    type="radio"
                    name="dietary"
                    className="accent-brand"
                    checked={dietary === opt}
                    onChange={() => setDietary(opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </Field>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4 rounded-xl border border-white/10 p-5 text-sm">
            <SummaryRow label="Convidat" value={guestName || "—"} />
            <SummaryRow label="Tiquets" value={String(quantity)} />
            <SummaryRow label="Dietètica" value={dietary} />
            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-white/50">Total</span>
              <span className="font-display text-xl font-bold">{total} €</span>
            </div>
            <p className="text-xs text-white/35">
              El pagament amb Stripe es connectarà en la següent iteració.
            </p>
          </div>
        )}

        <div className="mt-auto flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2)}
              className="flex-1 rounded-lg border border-white/15 py-3 text-sm font-semibold uppercase tracking-wide text-white/70"
            >
              Enrere
            </button>
          )}
          <button
            onClick={() =>
              step < 3 ? setStep((s) => (s + 1) as 2 | 3) : onClose()
            }
            disabled={step === 1 && !guestName}
            className="flex-1 rounded-lg bg-brand py-3 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-40"
          >
            {step < 3 ? "Continuar" : "Confirmar reserva"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-[0.1em] text-white/40">{label}</span>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/50">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
