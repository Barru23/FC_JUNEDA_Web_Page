"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { BookingDrawer } from "./BookingDrawer";
import type { ClubEvent } from "@/lib/data";
import { serviceFeeEur } from "@/lib/fees";
import { salesOpen, eventStatusLabel } from "@/lib/event-status";
import { CalendarDays, MapPin, UtensilsCrossed } from "lucide-react";

export function EventsSection() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [active, setActive] = useState<ClubEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) throw new Error(data.error ?? "No s'han pogut carregar els esdeveniments");
      const nextEvents = data as ClubEvent[];
      setEvents(nextEvents);
      setLoadError(null);
      setActive((current) => current
        ? nextEvents.find((item) => (item.dbId === current.dbId || item.id === current.id) && salesOpen(item.status, item.spotsLeft)) ?? null
        : null
      );
    } catch (err) {
      console.error(err);
      setLoadError(err instanceof Error ? err.message : "No s'han pogut carregar els esdeveniments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    window.addEventListener("focus", loadEvents);
    return () => window.removeEventListener("focus", loadEvents);
  }, [loadEvents]);

  return (
    <section id="esdeveniments" className="relative z-10 px-6 py-20 md:px-10">
      <SectionHeading label="Esdeveniments" title="Dinars i Sopars del Club" />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-white/40 text-sm">{loadError ?? "No hi ha esdeveniments disponibles actualment."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {events.map((event) => {
            const soldOut = !salesOpen(event.status, event.spotsLeft);
            const closedLabel = eventStatusLabel(event.status === "active" ? "sold_out" : event.status ?? "closed");
            const percentFull = event.totalSpots ? Math.round(((event.totalSpots - event.spotsLeft) / event.totalSpots) * 100) : 0;

            return (
              <article
                key={event.id}
                className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm transition-all duration-300 hover:border-brand/60 hover:shadow-[0_0_36px_rgba(225,6,0,0.24)]"
              >
                <div
                  className="relative aspect-square w-full overflow-hidden rounded-xl"
                  style={
                    event.imageUrl
                      ? undefined
                      : { background: "linear-gradient(160deg, rgba(225,6,0,0.35), rgba(10,10,11,0.9))" }
                  }
                >
                  {event.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  {soldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/70">
                        {closedLabel}
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="font-display text-2xl font-bold text-white">{event.title}</h3>

                <div className="flex flex-col gap-1.5 text-sm text-white/50">
                  <span className="flex items-center gap-2"><CalendarDays size={13} className="text-brand/70" />{event.date}</span>
                  <span className="flex items-center gap-2"><MapPin size={13} className="text-brand/70" />{event.location}</span>
                  {event.menu && <span className="flex items-center gap-2"><UtensilsCrossed size={13} className="text-brand/70" />{event.menu}</span>}
                </div>

                {/* Occupancy bar */}
                {event.totalSpots && !soldOut && (
                  <div className="flex flex-col gap-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-700"
                        style={{ width: `${percentFull}%` }}
                      />
                    </div>
                    <span className="text-xs text-white/35">{event.spotsLeft} places disponibles de {event.totalSpots}</span>
                  </div>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4">
                  <div className="flex flex-col">
                    <span className="font-display text-xl font-bold text-white">{Number(event.price).toFixed(2)} €</span>
                    {/* La gestio es calcula sobre el total de la comanda, no per
                        tiquet, aixi que aqui ensenyem la d'un sol tiquet -- que
                        es el preu que acompanya. El desglos exacte surt al
                        resum d'abans de pagar. */}
                    <span className="text-xs text-white/35">
                      + {serviceFeeEur(event.price).toFixed(2)} € de gestió
                    </span>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${soldOut ? "border-white/10 text-white/30" : "border-brand/30 bg-brand/10 text-brand-light"}`}>
                    {soldOut ? closedLabel : `${event.spotsLeft} places`}
                  </span>
                </div>

                <button
                  onClick={() => !soldOut && setActive(event)}
                  disabled={soldOut}
                  className="rounded-full bg-brand py-3 text-sm font-semibold uppercase tracking-wide text-white transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {soldOut ? closedLabel : "Reservar plaça"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {active && <BookingDrawer event={active} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </section>
  );
}

export function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-10 flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">{label}</span>
      <h2 className="font-display text-3xl font-bold text-white md:text-4xl">{title}</h2>
    </div>
  );
}
