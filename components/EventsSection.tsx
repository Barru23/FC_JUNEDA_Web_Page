"use client";

import { useState, useEffect } from "react";
import { BookingDrawer } from "./BookingDrawer";
import type { ClubEvent } from "@/lib/data";
import { CalendarDays, MapPin, UtensilsCrossed } from "lucide-react";

export function EventsSection() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [active, setActive] = useState<ClubEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data: unknown[]) => {
        // Map DB format to ClubEvent format
        const mapped: ClubEvent[] = (data as Record<string, unknown>[]).map((e) => ({
          id: e.id as string,
          title: e.title as string,
          date: e.date as string,
          location: e.location as string,
          menu: (e.menu as string) ?? "",
          price: e.price_eur as number,
          spotsLeft: e.spots_remaining as number,
          totalSpots: e.total_spots as number,
          status: e.status as string,
          bookingFee: e.booking_fee_eur as number,
        }));
        setEvents(mapped);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
        <p className="text-white/40 text-sm">No hi ha esdeveniments disponibles actualment.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {events.map((event) => {
            const soldOut = event.spotsLeft <= 0 || event.status === "sold_out";
            const percentFull = event.totalSpots ? Math.round(((event.totalSpots - event.spotsLeft) / event.totalSpots) * 100) : 0;

            return (
              <article
                key={event.id}
                className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm transition-all duration-300 hover:border-brand/60 hover:shadow-[0_0_36px_rgba(225,6,0,0.24)]"
              >
                <div
                  className="h-32 rounded-xl relative overflow-hidden"
                  style={{ background: "linear-gradient(160deg, rgba(225,6,0,0.35), rgba(10,10,11,0.9))" }}
                >
                  {soldOut && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                      <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/70">
                        Exhaurit
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
                {event.totalSpots && (
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
                    <span className="font-display text-xl font-bold text-white">{event.price} €</span>
                    {(event.bookingFee ?? 0) > 0 && (
                      <span className="text-xs text-white/35">+ {event.bookingFee} € gestió</span>
                    )}
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs ${soldOut ? "border-white/10 text-white/30" : "border-brand/30 bg-brand/10 text-brand-light"}`}>
                    {soldOut ? "Exhaurit" : `${event.spotsLeft} places`}
                  </span>
                </div>

                <button
                  onClick={() => !soldOut && setActive(event)}
                  disabled={soldOut}
                  className="rounded-full bg-brand py-3 text-sm font-semibold uppercase tracking-wide text-white transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {soldOut ? "Exhaurit" : "Reservar plaça"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {active && <BookingDrawer event={active} onClose={() => setActive(null)} />}
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
