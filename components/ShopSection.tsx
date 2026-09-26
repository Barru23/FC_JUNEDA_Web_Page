"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeading } from "./EventsSection";
import { KitViewer2D } from "./KitViewer2D";
import { Modal } from "@/components/ui/Modal";
import { serviceFeeEur } from "@/lib/fees";
import { ConsentCheckbox, LegalLink } from "@/components/legal/ConsentCheckbox";
import { Loader2, ShoppingBag, X } from "lucide-react";

type ViewType = "front" | "back";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_eur: number;
  sizes: string[];
  swatches: string[];
  customizable: boolean;
  image_url: string | null;
  stock: Record<string, number>;
  status: "active" | "out_of_stock" | "hidden";
};

export function ShopSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
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
  const [acceptaCondicions, setAcceptaCondicions] = useState(false);

  // Supabase is the only merchandise catalogue and price source. Refresh on
  // focus as well, so an admin change is reflected without a deployment.
  const loadProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No s'ha pogut carregar la botiga");
      if (!Array.isArray(data)) throw new Error("Resposta de botiga no vàlida");

      const nextProducts = data as Product[];
      setProducts(nextProducts);
      setProduct((current) => nextProducts.find((item) => item.id === current?.id) ?? nextProducts[0] ?? null);
      setCatalogueError(null);
    } catch (err) {
      setCatalogueError(err instanceof Error ? err.message : "No s'ha pogut carregar la botiga");
    } finally {
      setCatalogueLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    window.addEventListener("focus", loadProducts);
    return () => window.removeEventListener("focus", loadProducts);
  }, [loadProducts]);

  useEffect(() => {
    if (!product) return;
    const firstSize = product.sizes.find((item) => Number(product.stock?.[item] ?? 0) > 0) ?? product.sizes[0] ?? "";
    setSize(firstSize);
    setCustomize(false);
    setNumber("");
    setView("front");
  }, [product?.id]);

  const name = product?.name ?? "";
  const description = product?.description ?? "";
  const price = Number(product?.price_eur ?? 0);
  // El catàleg i el configurador ensenyen `price`; la gestió només apareix al
  // resum d'abans de pagar. El servidor la recalcula amb el preu de Supabase.
  const fee = serviceFeeEur(price);
  const total = price + fee;
  const sizes = product?.sizes ?? [];
  const stock = product?.stock ?? {};
  const productOutOfStock = !product || product.status !== "active" || !sizes.some((s) => Number(stock[s] ?? 0) > 0);
  const selectedSizeOutOfStock = productOutOfStock || !sizes.includes(size) || Number(stock[size] ?? 0) <= 0;

  useEffect(() => {
    if (selectedSizeOutOfStock) setCheckoutModalOpen(false);
  }, [selectedSizeOutOfStock]);

  const handleCustomFocus = () => {
    setView("back");
  };

  const handleOpenCheckout = () => {
    if (selectedSizeOutOfStock) return;
    setError(null);
    setCheckoutModalOpen(true);
  };

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerEmail || !buyerName || selectedSizeOutOfStock) return;
    if (customize && !number.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "merch",
          productId: product?.slug,
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

      {catalogueLoading && !product && (
        <div className="mb-6 h-56 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]" />
      )}

      {!catalogueLoading && !product && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-sm text-white/50">
          {catalogueError ?? "Ara mateix no hi ha productes publicats."}
        </div>
      )}

      {products.length > 1 && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {products.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setProduct(item)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                item.id === product?.id
                  ? "border-brand bg-brand/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <span className="block truncate text-sm font-bold text-white">{item.name}</span>
              <span className="mt-1 block font-display text-lg font-extrabold text-brand">{Number(item.price_eur).toFixed(2)} €</span>
            </button>
          ))}
        </div>
      )}

      {/* Main product showcase wrapper */}
      {product && (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 gap-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md lg:grid-cols-12 lg:p-8"
      >
        {/* Left Panel: Jersey Photo Viewer */}
        <div className="lg:col-span-7">
          {product.image_url ? (
            <div className="flex h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white sm:h-[450px] md:h-[550px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.image_url} alt={product.name} className="h-full w-full object-contain" />
            </div>
          ) : product.slug === "1a-equipacio" ? (
            <KitViewer2D view={view} onViewChange={setView} />
          ) : (
            <div className="flex h-[340px] flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] text-white/30 sm:h-[450px] md:h-[550px]">
              <ShoppingBag size={56} strokeWidth={1.2} />
              <span className="text-xs uppercase tracking-widest">Producte oficial</span>
            </div>
          )}
        </div>

        {/* Right Panel: Product Configurator and Checkout Form */}
        <div className="flex flex-col justify-between lg:col-span-5 lg:pl-4">
          <div className="flex flex-col gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand">
                PRODUCTE OFICIAL CF JUNEDA
              </span>
              <h3 className="font-display mt-2 text-3xl font-extrabold text-white md:text-4xl">
                {name}
              </h3>
              {productOutOfStock && (
                <p className="mt-3 inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/65">
                  Esgotat · No disponible
                </p>
              )}
              <p className="mt-4 text-sm leading-relaxed text-white/60">
                {description}
              </p>
            </div>

            {/* Colors Swatch Display */}
            {!!product.swatches?.length && <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                Colors Oficials
              </span>
              <div className="mt-2.5 flex items-center gap-2">
                {product.swatches.map((color) => (
                  <span key={color} className="h-6 w-6 rounded-full border border-white/20" style={{ backgroundColor: color }} title={color} />
                ))}
              </div>
            </div>}

            {/* Size Selector */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/40">
                Selecciona Talla
              </span>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const outOfStock = productOutOfStock || Number(stock[s] ?? 0) <= 0;
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
            {product.customizable && <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <label className="flex cursor-pointer items-center gap-3 text-xs font-bold uppercase tracking-wider text-white/70">
                <input
                  type="checkbox"
                  checked={customize}
                  onChange={(e) => {
                    setCustomize(e.target.checked);
                    if (e.target.checked) handleCustomFocus();
                  }}
                  className="h-5 w-5 accent-brand rounded cursor-pointer"
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
            </div>}
          </div>

          {/* Pricing and Submit Button */}
          <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
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
              className="group relative flex w-full items-center justify-center gap-2 rounded-full bg-brand px-10 py-4 font-display text-sm font-extrabold uppercase tracking-widest text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_24px_rgba(225,6,0,0.6)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-none sm:w-auto"
            >
              <ShoppingBag size={16} />
              {productOutOfStock ? "Esgotat" : selectedSizeOutOfStock ? "Talla esgotada" : "Comprar"}
            </button>
          </div>
        </div>
      </motion.div>
      )}

      {/* Checkout details modal */}
      <AnimatePresence>
        {checkoutModalOpen && (
          <Modal onClose={() => setCheckoutModalOpen(false)} ariaLabel="Finalitzar comanda">
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setCheckoutModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85svh] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-surface p-6 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand">Finalitzar comanda</span>
                  <h4 className="font-display text-xl font-bold text-white">{name}</h4>
                </div>
                <button
                  onClick={() => setCheckoutModalOpen(false)}
                  aria-label="Tancar la comanda"
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
                <div className="flex justify-between border-t border-white/10 pt-1.5">
                  <span>Preu:</span>
                  <span className="text-white">{price.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Despeses de gestió:</span>
                  <span className="text-white">{fee.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-1.5 font-semibold text-white">
                  <span>Total:</span>
                  <span className="font-display text-sm text-brand">{total.toFixed(2)} €</span>
                </div>
              </div>

              <form onSubmit={handleProcessCheckout} className="flex flex-col gap-3.5">
                <div>
                  <label htmlFor="shop-buyer-name" className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                    Nom i cognoms *
                  </label>
                  <input
                    id="shop-buyer-name"
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Marc Rovira"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-brand transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="shop-buyer-email" className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                    Correu electrònic *
                  </label>
                  <input
                    id="shop-buyer-email"
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
                  <label htmlFor="shop-buyer-phone" className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                    Telèfon (opcional)
                  </label>
                  <input
                    id="shop-buyer-phone"
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-brand transition-colors"
                  />
                </div>

                <ConsentCheckbox
                  id="condicions-botiga"
                  checked={acceptaCondicions}
                  onChange={setAcceptaCondicions}
                >
                  He llegit i accepto les{" "}
                  <LegalLink href="/condicions-compra">condicions de compra</LegalLink> i la{" "}
                  <LegalLink href="/privacitat">política de privacitat</LegalLink>.
                  {customize && (
                    <> Entenc que una peça personalitzada no admet devolució.</>
                  )}
                </ConsentCheckbox>

                {error && (
                  <div
                    className="rounded-lg bg-red-500/15 border border-red-500/30 px-3.5 py-2 text-xs text-red-400"
                    role="alert"
                    aria-live="assertive"
                  >
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
                    disabled={loading || !buyerName || !buyerEmail || (customize && !number.trim()) || selectedSizeOutOfStock || !acceptaCondicions}
                    aria-busy={loading}
                    className="flex-1 rounded-xl bg-brand py-3 text-xs font-extrabold uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <><Loader2 size={14} className="animate-spin" /> Tramitant...</>
                    ) : (
                      `Pagar ${total.toFixed(2)} €`
                    )}
                  </button>
                </div>

                <p className="text-center text-[10px] text-white/30">
                  🔒 Pagament segur canalitzat mitjançant Stripe
                </p>
              </form>
            </motion.div>
          </div>
          </Modal>
        )}
      </AnimatePresence>
    </section>
  );
}
