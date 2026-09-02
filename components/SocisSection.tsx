"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { SectionHeading } from "./EventsSection";
import { Loader2, Star, Shield, Trophy } from "lucide-react";
import type { MembershipTier } from "@/lib/data";

export function SocisSection() {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selected, setSelected] = useState<MembershipTier | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch membership tiers from Supabase via service role
    // (We reuse the admin key server-side — client just reads active tiers)
    fetch("/api/membership-tiers")
      .then((r) => r.json())
      .then((data) => {
        setTiers(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(() => {
        // Fallback: show a default tier if API not set up yet
        const fallback: MembershipTier = {
          id: "default",
          name: "Soci/Socia CF Juneda",
          price_eur: 25.00,
          season: "2025/26",
          benefits: "Acces a tots els partits, descomptes a la botiga, newsletter del club",
          status: "active",
        };
        setTiers([fallback]);
        setSelected(fallback);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSignup() {
    if (!selected || !name || !email) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "membership",
          tierId: selected.id,
          guestName: name,
          email,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconegut");
      if (data.url) window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al processar");
      setSubmitting(false);
    }
  }

  const benefits = selected?.benefits?.split(",").map((b) => b.trim()).filter(Boolean) ?? [];
  const benefitIcons = [Star, Shield, Trophy];

  return (
    <section id="socis" className="relative z-10 px-6 py-20 md:px-10">
      <SectionHeading label="Fes-te Soci/Socia" title="Uneix-te al Club" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Tier card */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-6 rounded-2xl border border-brand/30 bg-brand/5 p-8"
        >
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Temporada {selected?.season ?? "2025/26"}
            </span>
            <h3 className="font-display mt-2 text-3xl font-extrabold text-white">
              {loading ? "Carregant..." : selected?.name ?? "Soci/Socia"}
            </h3>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-5xl font-extrabold text-white">
                {selected?.price_eur?.toFixed(0) ?? "25"}
              </span>
              <span className="text-white/50">€ / temporada</span>
            </div>
          </div>

          {benefits.length > 0 && (
            <ul className="flex flex-col gap-3">
              {benefits.map((benefit, i) => {
                const Icon = benefitIcons[i % benefitIcons.length];
                return (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                    <Icon size={16} className="mt-0.5 shrink-0 text-brand" />
                    <span>{benefit}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-auto rounded-xl bg-black/20 border border-white/5 px-4 py-3">
            <p className="text-xs text-white/40 leading-relaxed">
              🔒 Pagament 100% segur via Stripe. La teva informació financera mai no toca els nostres servidors.
            </p>
          </div>
        </motion.div>

        {/* Right: Registration form */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-8"
        >
          <h4 className="font-display text-xl font-bold text-white">Les teves dades</h4>

          <div className="flex flex-col gap-4">
            <FormField label="Nom complet *">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Joan Garcia Puig"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-brand transition-colors"
              />
            </FormField>

            <FormField label="Correu electrònic *">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="joan@exemple.com"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-brand transition-colors"
              />
            </FormField>

            <FormField label="Telèfon (opcional)">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-brand transition-colors"
              />
            </FormField>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-xs text-red-400">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleSignup}
            disabled={submitting || !name || !email || loading}
            className="mt-auto w-full rounded-full bg-brand py-4 font-display text-sm font-extrabold uppercase tracking-widest text-white transition-all hover:scale-[1.02] hover:shadow-[0_0_24px_rgba(225,6,0,0.6)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Processant...</>
            ) : (
              `Fes-te Soci/Socia — ${selected?.price_eur?.toFixed(2) ?? "25.00"} €`
            )}
          </button>

          <p className="text-center text-xs text-white/30">
            Seràs redirigit a Stripe per completar el pagament de forma segura.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-[0.1em] text-white/40">{label}</label>
      {children}
    </div>
  );
}
