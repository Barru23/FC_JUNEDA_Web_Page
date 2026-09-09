"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import type { ClubEvent } from "@/lib/data";
import { Modal } from "@/components/ui/Modal";
import { serviceFeeEur } from "@/lib/fees";
import { ConsentCheckbox, LegalLink } from "@/components/legal/ConsentCheckbox";

const DIETARY_OPTIONS = [
  "Cap intolerancia",
  "Vegetaria",
  "Vega",
  "Sense gluten",
  "Sense lactics",
];

export function BookingDrawer({
  event,
  onClose,
}: {
  event: ClubEvent;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [quantity, setQuantity] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dietary, setDietary] = useState(DIETARY_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptaCondicions, setAcceptaCondicions] = useState(false);
  const [acceptaDietetica, setAcceptaDietetica] = useState(false);

  // Nomes per mostrar-lo: el servidor el torna a calcular amb el preu de
  // Supabase, aixi que aquest numero no pot alterar el que es cobra.
  // Nomes les opcions diferents de la primera poden revelar una condicio de
  // salut (celiaquia, intolerancia). "Cap intolerancia" no diu res de ningu i
  // no ha de demanar cap consentiment addicional.
  const dieteticaSensible = dietary !== DIETARY_OPTIONS[0];
  const potPagar = acceptaCondicions && (!dieteticaSensible || acceptaDietetica);

  const baseTotal = quantity * event.price;
  const fee = serviceFeeEur(baseTotal);
  const total = baseTotal + fee;

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "event",
          eventId: event.dbId ?? event.id,
          quantity,
          guestName,
          dietary,
          email,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconegut");
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al processar el pagament");
      setLoading(false);
    }
  }

  const steps = ["Tiquets", "Dietètica", "Contacte", "Confirmació"];

  return (
    <Modal onClose={onClose} ariaLabel={`Reserva per a ${event.title}`}>
      <motion.div
        className="fixed inset-0 z-50 bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-surface"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4 p-5 pb-4 sm:p-8 sm:pb-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.14em] text-brand">Reserva</p>
            <h3 className="font-display truncate text-2xl font-bold">{event.title}</h3>
            <p className="mt-1 text-sm text-white/50">
              {event.date} · {event.location}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tancar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-white/60 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator: compact on mobile, full labels from sm: */}
        <div className="shrink-0 px-5 sm:px-8">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-white/40 sm:hidden">
            <span>
              Pas {step} de {steps.length}
            </span>
            <span className="text-brand">{steps[step - 1]}</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10 sm:hidden">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${(step / steps.length) * 100}%` }}
            />
          </div>
          <div className="hidden flex-wrap gap-2 text-[11px] uppercase tracking-[0.1em] text-white/40 sm:flex">
            {steps.map((label, i) => (
              <span key={label} className={`flex items-center gap-2 ${step >= i + 1 ? "text-brand" : ""}`}>
                {i > 0 && <span className="text-white/20">—</span>}
                {i + 1}. {label}
              </span>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6">
          {/* Step 1: Tiquets */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <Field label="Nom del convidat principal">
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
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-lg"
                    aria-label="Menys tiquets"
                  >
                    −
                  </button>
                  <span className="font-display text-lg font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(event.spotsLeft, q + 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-lg"
                    aria-label="Més tiquets"
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

          {/* Step 2: Dietètica */}
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

          {/* Step 3: Contacte */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <Field label="Correu electrònic">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-brand"
                />
                <p className="text-xs text-white/35">Rebràs la confirmació de reserva per correu</p>
              </Field>
              <Field label="Telèfon (opcional)">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-brand"
                />
              </Field>
            </div>
          )}

          {/* Step 4: Confirmació */}
          {step === 4 && (
            <div className="flex flex-col gap-4 rounded-xl border border-white/10 p-5 text-sm">
              <SummaryRow label="Convidat" value={guestName || "—"} />
              <SummaryRow label="Tiquets" value={String(quantity)} />
              <SummaryRow label="Dietètica" value={dietary} />
              <SummaryRow label="Correu" value={email} />
              <SummaryRow label="Preu base" value={`${baseTotal.toFixed(2)} €`} />
              <SummaryRow label="Despeses de gestió" value={`${fee.toFixed(2)} €`} />
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-white/50">Total</span>
                <span className="font-display text-xl font-bold">{total.toFixed(2)} €</span>
              </div>
              <div className="mt-1 flex flex-col gap-2.5">
                <ConsentCheckbox
                  id="condicions-event"
                  checked={acceptaCondicions}
                  onChange={setAcceptaCondicions}
                >
                  He llegit i accepto les{" "}
                  <LegalLink href="/condicions-compra">condicions de compra</LegalLink> i la{" "}
                  <LegalLink href="/privacitat">política de privacitat</LegalLink>. Entenc que
                  els tiquets d&apos;un acte amb data concreta no tenen dret de desistiment.
                </ConsentCheckbox>

                {dieteticaSensible && (
                  <ConsentCheckbox
                    id="dietetica-event"
                    checked={acceptaDietetica}
                    onChange={setAcceptaDietetica}
                  >
                    Consenteixo que el club tracti el requeriment dietètic que he indicat
                    (&laquo;{dietary}&raquo;) amb l&apos;única finalitat de preparar el menú.
                    Pot revelar informació sobre la meva salut.
                  </ConsentCheckbox>
                )}
              </div>

              <p className="text-xs text-white/35">
                Seràs redirigit a la plataforma de pagament segur de Stripe. 🔒
              </p>
              {error && (
                <p className="rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-xs text-red-400">
                  ⚠️ {error}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex shrink-0 gap-3 border-t border-white/10 px-5 pt-5 pb-safe sm:px-8 sm:pt-8">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              disabled={loading}
              className="flex-1 rounded-lg border border-white/15 py-3 text-sm font-semibold uppercase tracking-wide text-white/70 disabled:opacity-40"
            >
              Enrere
            </button>
          )}
          <button
            onClick={() => step < 4 ? setStep((s) => (s + 1) as 2 | 3 | 4) : handleCheckout()}
            disabled={
              loading ||
              (step === 1 && !guestName) ||
              (step === 3 && !email) ||
              (step === 4 && !potPagar)
            }
            className="flex-1 rounded-lg bg-brand py-3 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Processant...</>
            ) : step < 4 ? "Continuar" : (
              `Pagar ${total.toFixed(2)} €`
            )}
          </button>
        </div>
      </motion.div>
    </Modal>
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
