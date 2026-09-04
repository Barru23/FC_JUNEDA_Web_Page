"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeading } from "./EventsSection";
import { KitViewer2D } from "./KitViewer2D";
import { Loader2, ShoppingBag, X } from "lucide-react";

type ViewType = "front" | "back";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_eur: number;
  sizes: string[];
  stock: Record<string, number>;
};

const DEFAULT_SIZES = ["S", "M", "L", "XL", "NEN/A"];
const FALLBACK_PRODUCT = {
  slug: "1a-equipacio",
  name: "Conjunt Oficial Juneda",
  description:
    "La pell de l'equip per a la nova temporada a Segona Catalana. Samarreta vermella amb trama diagonal blava de disseny exclusiu, escut brodat del club, i els patrocinis oficials de la comarca. Completa amb pantaló blau marí i mitgetes oficials de joc.",
  price_eur: 39.9,
  sizes: DEFAULT_SIZES,
};

export function ShopSection() {
  const [product, setProduct] = useState<Product | null>(null);
  const [view, setView] = useState<ViewType>("front");
  const [size, setSize] = useState<string>("M");
  const [customize, setCustomize] = useState(false);
  const [number, setNumber] = useState("");

  // Checkout modal & state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Price, name, description, sizes and stock come from Supabase so the
  // Junta can edit them from /admin and the web + Stripe charge stay in
  // sync — a hardcoded price here previously drifted from what the DB
  // (and therefore checkout) actually charged.
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data: Product[]) => {
        const found = data.find((p) => p.slug === "1a-equipacio") ?? data[0];
        if (found) {
          setProduct(found);
          if ((found.stock?.[size] ?? 1) <= 0) {
            const firstAvailable = (found.sizes ?? DEFAULT_SIZES).find((s) => (found.stock?.[s] ?? 1) > 0);
            if (firstAvailable) setSize(firstAvailable);
          }
        }
      })
      .catch(() => {
        // Keep the FALLBACK_PRODUCT values already reflected in defaults below.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const name = product?.name ?? FALLBACK_PRODUCT.name;
  const description = product?.description ?? FALLBACK_PRODUCT.description;
  const price = product?.price_eur ?? FALLBACK_PRODUCT.price_eur;
  const sizes = product?.sizes?.length ? product.sizes : FALLBACK_PRODUCT.sizes;
  const stock = product?.stock ?? {};
  const selectedSizeOutOfStock = (stock[size] ?? 1) <= 0;

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
    if (customize && !number.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "merch",
          productId: product?.slug ?? FALLBACK_PRODUCT.slug,
          size,
          customNumber: customize ? number.trim() : undefined,
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
        {/* Left Panel: Jersey Photo Viewer */}
        <div className="lg:col-span-7">
          <KitViewer2D view={view} onViewChange={setView} />
        </div>

        {/* Right Panel: Product Configurator and Checkout Form */}
        <div className="flex flex-col justify-between lg:col-span-5 lg:pl-4">
          <div className="flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                1a EQUIPACIÓ OFICIAL 2026/2027
              </span>
              <h3 className="font-display mt-2 text-3xl font-extrabold text-white md:text-4xl">
                {name}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                {description}
              </p>
            </div>

            {/* Colors Swatch Display */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                Colors Oficials
              </span>
              <div className="mt-2.5 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full border border-white/20 bg-[#e10600]" title="Vermell Oficial" />
                <span className="h-6 w-6 rounded-full border border-white/20 bg-[#0b2e83]" title="Detalls Blau Marí" />
                <span className="h-6 w-6 rounded-full border border-white/20 bg-[#ffffff]" title="Detalls en Blanc" />
              </div>
            </div>

            {/* Size Selector */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                Selecciona Talla
              </span>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const outOfStock = (stock[s] ?? 1) <= 0;
                  return (
                    <button
                      key={s}
                      onClick={() => !outOfStock && setSize(s)}
                      disabled={outOfStock}
                      title={outOfStock ? "Esgotat" : undefined}
                      className={`rounded-xl border px-4 py-2 text-xs font-bold tracking-wider transition-all duration-300 ${
                        outOfStock
                          ? "cursor-not-allowed border-white/5 bg-black/10 text-white/25 line-through"
                          : size === s
                          ? "border-brand bg-brand/15 text-brand-light shadow-[0_0_10px_rgba(225,6,0,0.15)]"
                          : "border-white/10 bg-black/20 text-white/60 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
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
                <span>Personalitzar dorsal (+0.00 €)</span>
              </label>

              {customize && (
                <div className="mt-4">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1">
                    Dorsal
                  </label>
                  <input
                    type="text"
                    value={number}
                    onFocus={handleCustomFocus}
                    onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").substring(0, 2))}
                    placeholder="10"
                    className="w-full max-w-[120px] rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white text-center placeholder-white/25 outline-none focus:border-brand transition-colors"
                  />
                  {!number.trim() && (
                    <p className="mt-1.5 text-[10px] text-white/35">Introdueix un dorsal per continuar</p>
                  )}
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
              disabled={selectedSizeOutOfStock}
              className="group relative flex items-center justify-center gap-2 rounded-full bg-brand px-10 py-4 font-display text-sm font-extrabold uppercase tracking-widest text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(225,6,0,0.6)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <ShoppingBag size={16} />
              {selectedSizeOutOfStock ? "Talla esgotada" : "Comprar"}
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
                  <h4 className="font-display text-xl font-bold text-white">{name}</h4>
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
                    <span>Dorsal personalitzat:</span>
                    <span className="font-bold text-brand">#{number}</span>
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
                    disabled={loading || !buyerName || !buyerEmail || (customize && !number.trim()) || selectedSizeOutOfStock}
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
