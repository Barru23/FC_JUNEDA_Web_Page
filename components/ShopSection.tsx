"use client";

import Image from "next/image";
import { useState } from "react";
import { products, type Product } from "@/lib/data";
import { SectionHeading } from "./EventsSection";

export function ShopSection() {
  return (
    <section id="botiga" className="relative z-10 px-6 py-20 md:px-10">
      <SectionHeading label="Botiga Oficial" title="Marxandatge del Club" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [size, setSize] = useState(product.sizes[0]);
  const [customize, setCustomize] = useState(false);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");

  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm transition-all duration-300 hover:border-brand/60 hover:shadow-[0_0_36px_rgba(225,6,0,0.24)]">
      <div className="relative h-40 overflow-hidden rounded-xl">
        {product.image ? (
          <>
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="360px"
              style={{ objectFit: "cover", objectPosition: "15% 25%" }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 8%, rgba(10,10,11,0.75) 50%, rgba(10,10,11,0.97) 85%)",
              }}
            />
          </>
        ) : (
          <div
            className="flex h-full items-center justify-center"
            style={{
              background: `linear-gradient(160deg, ${product.swatches[0]}55, rgba(10,10,11,0.9))`,
            }}
          >
            <span className="font-display text-4xl font-extrabold text-white/10">
              {customize && number ? `#${number}` : "CFJ"}
            </span>
          </div>
        )}
      </div>

      <h3 className="font-display text-xl font-bold text-white">{product.name}</h3>

      <div className="flex gap-2">
        {product.swatches.map((color) => (
          <span
            key={color}
            className="h-6 w-6 rounded-full border border-white/15"
            style={{ background: color }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {product.sizes.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide transition-colors ${
              size === s
                ? "border-brand bg-brand text-white"
                : "border-white/15 text-white/60 hover:border-white/35"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {product.customizable && (
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50">
            <input
              type="checkbox"
              checked={customize}
              onChange={(e) => setCustomize(e.target.checked)}
              className="accent-brand"
            />
            Personalitzar nom i dorsal
          </label>
          {customize && (
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom"
                maxLength={12}
                className="w-2/3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="Nº"
                maxLength={2}
                className="w-1/3 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </div>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4">
        <span className="font-display text-xl font-bold text-white">{product.price.toFixed(2)} €</span>
        <button className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white">
          Comprar
        </button>
      </div>
    </article>
  );
}
