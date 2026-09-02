"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeading } from "./EventsSection";
import { KitViewer2D } from "./KitViewer2D";
import { Loader2, ShoppingBag, X } from "lucide-react";

type ViewType = "front" | "back";
type SizeType = "S" | "M" | "L" | "XL" | "NEN/A";

export function ShopSection() {
  const [view, setView] = useState<ViewType>("front");
  const [size, setSize] = useState<SizeType>("M");
  const [customize, setCustomize] = useState(false);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");

  // Checkout modal & state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = 39.9;

  const handleCustomFocus = () => {
    setView("back");
  };

  const handleOpenCheckout = () => {
    setError(null);
    setCheckoutModalOpen(true);
  };

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerEmail || !buyerName) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "merch",
          productId: "1a-equipacio",
          size,
          customName: customize ? name.trim() || "BARRU" : undefined,
          customNumber: customize ? number.trim() || "10" : undefined,
          guestName: buyerName.trim(),
          email: buyerEmail.trim(),
          phone: buyerPhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al tramitar la comanda");
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al connectar amb Stripe");
      setLoading(false);
    }
  };

  return (
    <section id="botiga" className="relative z-10 px-6 py-20 md:px-10">
      <SectionHeading label="Botiga Oficial" title="Marxandatge del Club" />

      {/* Main product showcase wrapper */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 gap-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md lg:grid-cols-12 lg:p-8"
      >
        {/* Left Panel: 2D Interactive Jersey Viewer */}
        <div className="lg:col-span-7">
          <KitViewer2D
            view={view}
            onViewChange={setView}
            name={name}
            number={number}
            customize={customize}
          />
        </div>

        {/* Right Panel: Product Configurator and Checkout Form */}
        <div className="flex flex-col justify-between lg:col-span-5 lg:pl-4">
          <div className="flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                1a EQUIPACIÓ OFICIAL 2026/2027
              </span>
              <h3 className="font-display mt-2 text-3xl font-extrabold text-white md:text-4xl">
                Conjunt Oficial Juneda
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                La pell de l&apos;equip per a la nova temporada a Segona Catalana. Samarreta
                vermella amb trama diagonal blava de disseny exclusiu, escut brodat del club,
                i els patrocinis oficials de la comarca. Completa amb pantaló blau marí i
                mitgetes oficials de joc.
              </p>
            </div>

            {/* Colors Swatch Display */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                Colors Oficials
              </span>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full border border-white/20 bg-[#e10600]" title="Vermell Oficial" />
                <span className="h-6 w-6 rounded-full border border-white/20 bg-[#0b2e83]" title="Blau Marí" />
                <span className="h-6 w-6 rounded-full border border-white/20 bg-[#ffffff]" title="Detalls en Blanc" />
              </div>
            </div>

            {/* Size Selector */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                Selecciona Talla
              </span>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {(["S", "M", "L", "XL", "NEN/A"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`rounded-xl border px-4 py-2 text-xs font-bold tracking-wider transition-all duration-300 ${
                      size === s
                        ? "border-brand bg-brand/15 text-brand-light shadow-[0_0_10px_rgba(225,6,0,0.15)]"
                        : "border-white/10 bg-black/20 text-white/60 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Customization Details */}
            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <label className="flex cursor-pointer items-center gap-3 text-xs font-bold uppercase tracking-wider text-white/70">
                <input
                  type="checkbox"
                  checked={customize}
                  onChange={(e) => {
                    setCustomize(e.target.checked);
                    if (e.target.checked) handleCustomFocus();
                  }}
                  className="h-4.5 w-4.5 accent-brand rounded cursor-pointer"
                />
                <span>Personalitzar nom i dorsal (+0.00 €)</span>
              </label>

              {customize && (
                <div className="mt-4 flex gap-3">
                  <div className="flex-grow">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={name}
                      onFocus={handleCustomFocus}
                      onChange={(e) => setName(e.target.value.substring(0, 12))}
                      placeholder="BARRU"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-brand transition-colors"
                    />
                  </div>
                  <div className="w-1/3">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1">
                      Dorsal
                    </label>
                    <input
                      type="text"
                      value={number}
                      onFocus={handleCustomFocus}
                      onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").substring(0, 2))}
                      placeholder="10"
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white text-center placeholder-white/25 outline-none focus:border-brand transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing and Submit Button */}
          <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Preu Total
              </span>
              <span className="font-display text-3xl font-extrabold text-white">
                {price.toFixed(2)} €
              </span>
            </div>
            <button
              onClick={handleOpenCheckout}
              className="group relative flex items-center justify-center gap-2 rounded-full bg-brand px-10 py-4 font-display text-sm font-extrabold uppercase tracking-widest text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(225,6,0,0.6)]"
            >
              <ShoppingBag size={16} />
              Comprar
            </button>
          </div>
        </div>
      </motion.div>

      {/* Checkout details modal */}
      <AnimatePresence>
        {checkoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-6 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand">Finalitzar comanda</span>
                  <h4 className="font-display text-xl font-bold text-white">1a Equipació CF Juneda</h4>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  className="rounded-full border border-white/10 p-2 text-white/50 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Order summary pill */}
              <div className="mb-4 rounded-xl border border-white/10 bg-black/30 p-3.5 text-xs text-white/70 space-y-1.5">
                <div className="flex justify-between">
                  <span>Talla seleccionada:</span>
                  <span className="font-bold text-white">{size}</span>
                </div>
                {customize && (
                  <div className="flex justify-between">
                    <span>Personalització:</span>
                    <span className="font-bold text-brand">{name || "BARRU"} #{number || "10"}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/10 pt-1.5 font-semibold text-white">
                  <span>Total:</span>
                  <span className="font-display text-sm text-brand">{price.toFixed(2)} €</span>
                </div>
              </div>

              <form onSubmit={handleProcessCheckout} className="flex flex-col gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                    Nom i cognoms *
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Marc Rovira"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-brand transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                    Correu electrònic *
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="marc@exemple.cat"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-brand transition-colors"
                  />
                  <p className="mt-1 text-[10px] text-white/35">Rebràs la confirmació i l&apos;avís de recollida per correu</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                    Telèfon (opcional)
                  </label>
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-brand transition-colors"
                  />
                </div>

                {error && (
                  <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3.5 py-2 text-xs text-red-400">
                    ⚠️ {error}
                  </div>
                )}

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutModalOpen(false)}
                    className="flex-1 rounded-xl border border-white/15 py-3 text-xs font-semibold uppercase tracking-wider text-white/70 hover:bg-white/5"
                  >
                    Cancel·lar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !buyerName || !buyerEmail}
                    className="flex-1 rounded-xl bg-brand py-3 text-xs font-extrabold uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 size={14} className="animate-spin" /> Tramitant...</>
                    ) : (
                      `Pagar ${price.toFixed(2)} €`
                    )}
                  </button>
                </div>

                <p className="text-center text-[10px] text-white/30">
                  🔒 Pagament segur canalitzat mitjançant Stripe
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
