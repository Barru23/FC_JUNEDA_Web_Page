"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SectionHeading } from "./EventsSection";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  Users,
  Smile,
  GraduationCap,
  ShieldCheck,
  Handshake,
  Check,
  Loader2,
  Landmark,
  Instagram,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { MembershipTierEntry } from "@/lib/memberships";
import { ConsentCheckbox, LegalLink } from "@/components/legal/ConsentCheckbox";
import { validaDni, validaIban, formatIban, normalitzaDni } from "@/lib/identitat";

const TIER_ICONS = {
  Users,
  Smile,
  GraduationCap,
  Shield: ShieldCheck,
  Handshake,
};

export function SocisSection() {
  const [tiers, setTiers] = useState<MembershipTierEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string>("soci-general");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dni, setDni] = useState("");
  const [iban, setIban] = useState("");
  const [notes, setNotes] = useState("");
  const [acceptaMandat, setAcceptaMandat] = useState(false);
  const [acceptaCondicions, setAcceptaCondicions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const isMobile = useIsMobile();
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/membership-tiers")
      .then((r) => r.json())
      .then((data: MembershipTierEntry[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setTiers(data);
          setSelectedSlug((prev) => (data.some((t) => t.slug === prev) ? prev : data[0].slug));
        }
      })
      .catch((err) => {
        console.error("Error carregant modalitats de soci:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedTier = tiers.find((t) => t.slug === selectedSlug) ?? tiers[0];

  // Validacio al navegador nomes per avisar abans d'enviar; qui mana es
  // /api/socis, que ho torna a comprovar tot.
  const dniValid = dni.trim() === "" || validaDni(dni);
  const ibanValid = iban.trim() === "" || validaIban(iban);
  const potEnviar =
    !!selectedTier &&
    !!name.trim() &&
    !!email.trim() &&
    !!phone.trim() &&
    validaDni(dni) &&
    validaIban(iban) &&
    acceptaMandat &&
    acceptaCondicions;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!potEnviar || !selectedTier) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/socis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierSlug: selectedTier.slug,
          nom: name.trim(),
          email: email.trim(),
          telefon: phone.trim(),
          dni: dni.trim(),
          iban: iban.trim(),
          notes: notes.trim() || undefined,
          acceptaMandat,
          acceptaCondicions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error desconegut en tramitar l'alta");
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al processar el registre");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="socis" className="relative z-10 px-6 py-20 md:px-10">
      <SectionHeading
        label="Campanya de Socis 2026/27"
        title="Fes-te Soci · La Força d'un Poble"
      />

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-2xl text-sm md:text-base leading-relaxed text-white/60 mb-10"
      >
        El CF Juneda no és només un equip sobre la gespa, és la força de tot un
        poble empenyent des de la grada. Tria la teva modalitat, fes-te soci i
        forma part de la <span className="text-brand font-bold">Marea Roja</span>!
      </motion.p>

      {/* 5 Membership Tiers Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-2xl border border-white/10 bg-white/[0.02] animate-pulse"
              />
            ))
          : tiers.map((tier) => {
              const isSelected = tier.slug === selectedSlug;
              const IconComponent =
                TIER_ICONS[tier.icon as keyof typeof TIER_ICONS] ?? Users;

              return (
                <motion.button
                  key={tier.slug}
                  type="button"
                  onClick={() => {
                    setSelectedSlug(tier.slug);
                    setError(null);
                    if (isMobile) {
                      requestAnimationFrame(() =>
                        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                      );
                    }
                  }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  aria-pressed={isSelected}
                  className={`relative flex flex-col justify-between text-left p-5 rounded-2xl border transition-all duration-300 ${
                    isSelected
                      ? "border-brand bg-brand/10 shadow-[0_0_32px_rgba(225,6,0,0.35)] ring-1 ring-brand"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start justify-between w-full mb-3">
                    <div
                      className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-brand text-white shadow-[0_0_16px_rgba(225,6,0,0.6)]"
                          : "bg-white/5 text-white/70 border border-white/10"
                      }`}
                    >
                      <IconComponent size={20} />
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        isSelected
                          ? "border-brand/50 bg-brand/20 text-white"
                          : "border-white/10 bg-white/5 text-white/50"
                      }`}
                    >
                      {tier.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-base font-extrabold uppercase tracking-tight text-white mb-1">
                      {tier.name}
                    </h3>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-display text-3xl font-black text-white">
                        {tier.price_eur.toFixed(0)}€
                      </span>
                      <span className="text-[11px] text-white/45">/ temporada</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 flex items-center justify-center h-5 w-5 rounded-full bg-brand text-white">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </motion.button>
              );
            })}
      </div>

      {/* Detail Card and Registration Form */}
      {selectedTier && (
        <div ref={detailRef} className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start scroll-mt-24">
          {/* Left: Selected Tier Details */}
          <motion.div
            key={selectedTier.slug}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-5 flex flex-col gap-6 rounded-3xl border border-brand/40 bg-gradient-to-b from-brand/15 via-brand/5 to-black/60 p-7 md:p-8 backdrop-blur-md"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/20 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">
                  <Sparkles size={12} /> Temporada {selectedTier.season}
                </span>
                <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-semibold text-white/60">
                  {selectedTier.target}
                </span>
              </div>

              <h3 className="font-display mt-4 text-3xl md:text-4xl font-black uppercase text-white">
                {selectedTier.name}
              </h3>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-5xl md:text-6xl font-black text-white tracking-tight">
                  {selectedTier.price_eur.toFixed(0)}
                </span>
                <span className="font-display text-2xl font-bold text-brand">€</span>
                <span className="text-sm text-white/50">/ quota temporada</span>
              </div>

              <p className="mt-3 text-xs md:text-sm leading-relaxed text-white/70">
                {selectedTier.description}
              </p>
            </div>

            <div className="border-t border-white/10 pt-5">
              <span className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-3">
                Què inclou aquesta quota:
              </span>
              <ul className="flex flex-col gap-2.5">
                {selectedTier.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs md:text-sm text-white/80">
                    <div className="h-5 w-5 rounded-full bg-brand/20 border border-brand/40 flex items-center justify-center shrink-0 mt-0.5 text-brand">
                      <Check size={12} strokeWidth={3} />
                    </div>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-2 rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-start gap-2.5 text-xs text-white/60">
                <Landmark size={15} className="text-brand shrink-0 mt-0.5" />
                <span>
                  <strong>No pagues res ara.</strong> L&apos;alta no comporta cap cobrament en
                  aquest web: el club domicilia la quota anual al compte que ens indiquis.
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right: Registration Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-7 flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-7 md:p-8 backdrop-blur-md"
          >
            {done ? (
              <div className="flex flex-col items-start gap-4 py-6" role="status" aria-live="polite">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand/40 bg-brand/15 text-brand">
                  <Check size={26} strokeWidth={3} />
                </div>
                <h4 className="font-display text-2xl font-black uppercase text-white">
                  Alta rebuda, {name.split(" ")[0]}!
                </h4>
                <p className="text-sm leading-relaxed text-white/65">
                  Ja constes com a <strong className="text-white">{selectedTier.name}</strong> per
                  a la temporada {selectedTier.season}. La Junta revisarà les teves dades i
                  domiciliarà la quota de {selectedTier.price_eur.toFixed(2)} € al compte que
                  ens has indicat. Rebràs un correu de confirmació a {email}.
                </p>
                <p className="text-xs text-white/40">
                  Si veus qualsevol dada incorrecta, escriu-nos i ho corregim abans
                  d&apos;emetre el rebut.
                </p>
              </div>
            ) : (
            <>
            <div>
              <h4 className="font-display text-2xl font-black uppercase text-white">
                Inscriu-te ara com a {selectedTier.name}
              </h4>
              <p className="text-xs text-white/50 mt-1">
                Deixa&apos;ns les teves dades per donar-te d&apos;alta per a la temporada{" "}
                {selectedTier.season}. No es paga res per aquest web.
              </p>
            </div>

            <form onSubmit={handleSignup} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Nom i cognoms *">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Pau Garcia Solé"
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-brand"
                  />
                </FormField>

                <FormField label="DNI / NIE *">
                  <input
                    type="text"
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value.toUpperCase())}
                    onBlur={() => dni.trim() && setDni(normalitzaDni(dni))}
                    placeholder="12345678X"
                    aria-invalid={!dniValid}
                    className={`w-full rounded-xl border bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-brand ${
                      dniValid ? "border-white/10" : "border-red-500/60"
                    }`}
                  />
                  {!dniValid ? (
                    <span className="text-[11px] text-red-400">
                      La lletra no correspon al número. És un dígit de control:
                      copia&apos;l tal com surt al document.
                    </span>
                  ) : (
                    <span className="text-[11px] text-white/35">
                      Amb la lletra. Si comença per zero, no cal que l&apos;escriguis.
                    </span>
                  )}
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Correu electrònic *">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pau@exemple.cat"
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-brand"
                  />
                </FormField>

                <FormField label="Telèfon de contacte *">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                    className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-brand"
                  />
                </FormField>
              </div>

              <FormField label="IBAN del compte on domiciliar la quota *">
                <input
                  type="text"
                  required
                  inputMode="text"
                  autoComplete="off"
                  value={iban}
                  onChange={(e) => setIban(e.target.value.toUpperCase())}
                  onBlur={() => iban.trim() && setIban(formatIban(iban))}
                  placeholder="ES91 2100 0418 4502 0005 1332"
                  aria-invalid={!ibanValid}
                  className={`w-full rounded-xl border bg-black/50 px-4 py-3 font-mono text-sm tracking-wide text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-white/25 outline-none transition-colors focus:border-brand ${
                    ibanValid ? "border-white/10" : "border-red-500/60"
                  }`}
                />
                {!ibanValid ? (
                  <span className="text-[11px] text-red-400">
                    Aquest IBAN no és correcte. Copia&apos;l tal com surt a l&apos;app del teu banc.
                  </span>
                ) : (
                  <span className="text-[11px] text-white/35">
                    24 caràcters que comencen per ES. El comprovem abans d&apos;enviar-lo.
                  </span>
                )}
              </FormField>

              <FormField
                label={
                  selectedTier.slug === "soci-infantil"
                    ? "Nom i edat del menor"
                    : selectedTier.slug === "soci-afiliats-efi"
                    ? "Jugador/a de referència a l'EFI"
                    : "Observacions o comentaris (opcional)"
                }
              >
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    selectedTier.slug === "soci-infantil"
                      ? "Ex: Marc Garcia (8 anys)"
                      : selectedTier.slug === "soci-afiliats-efi"
                      ? "Ex: Pare del jugador Roger Garcia - Equip Aleví EFI"
                      : "Qualsevol informació addicional per al club"
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-brand"
                />
              </FormField>

              <div className="mt-1 flex flex-col gap-2.5">
                <ConsentCheckbox
                  id="mandat-sepa"
                  checked={acceptaMandat}
                  onChange={setAcceptaMandat}
                >
                  Autoritzo el <strong>Club Futbol Juneda</strong> a enviar ordres a la meva
                  entitat bancària per carregar al compte indicat la quota anual de{" "}
                  <strong>{selectedTier.price_eur.toFixed(2)} €</strong> de la modalitat{" "}
                  {selectedTier.name} (temporada {selectedTier.season}), i autoritzo el banc a
                  fer-ho. Com a client bancari tinc dret al reemborsament segons el contracte
                  amb el meu banc, i el puc sol·licitar en les 8 setmanes següents al càrrec.
                </ConsentCheckbox>

                <ConsentCheckbox
                  id="condicions-soci"
                  checked={acceptaCondicions}
                  onChange={setAcceptaCondicions}
                >
                  He llegit i accepto les{" "}
                  <LegalLink href="/condicions-compra">condicions de compra</LegalLink> i la{" "}
                  <LegalLink href="/privacitat">política de privacitat</LegalLink>.
                </ConsentCheckbox>
              </div>

              {error && (
                <div
                  className="rounded-xl border border-red-500/30 bg-red-500/15 p-4 text-xs text-red-300"
                  role="alert"
                  aria-live="assertive"
                >
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !potEnviar}
                aria-busy={submitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 font-display text-sm font-black uppercase tracking-widest text-white transition-all hover:scale-[1.01] hover:shadow-[0_0_30px_rgba(225,6,0,0.6)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Tramitant l&apos;alta...
                  </>
                ) : (
                  <>
                    Enviar la meva alta de soci
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="text-center text-[11px] text-white/40">
                No es fa cap cobrament ara. El club domiciliarà la quota de{" "}
                {selectedTier.price_eur.toFixed(2)} € al compte que has indicat.
              </p>
            </form>
            </>
            )}

            {/* Offline & Instagram info box from image.png */}
            <div className="mt-2 rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 flex items-center justify-center shrink-0 text-white">
                    <Instagram size={18} />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-white block">
                      Prefereixes fer-te soci presencialment o per Instagram?
                    </span>
                    <span className="text-white/50">
                      Envia&apos;ns un Missatge Directe a <strong>@cfjuneda</strong> o durant els partits de pretemporada al Camp Municipal.
                    </span>
                  </div>
                </div>
                <a
                  href="https://www.instagram.com/cfjuneda"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-bold text-brand hover:underline flex items-center gap-1"
                >
                  @cfjuneda →
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-white/50">
        {label}
      </span>
      {children}
    </label>
  );
}
