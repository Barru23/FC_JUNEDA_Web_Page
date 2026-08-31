"use client";

import { useState } from "react";
import { events } from "@/lib/data";
import { BookingDrawer } from "./BookingDrawer";

export function EventsSection() {
  const [active, setActive] = useState<(typeof events)[number] | null>(null);

  return (
    <section id="esdeveniments" className="relative z-10 px-6 py-20 md:px-10">
      <SectionHeading label="Esdeveniments" title="Dinars i Sopars del Club" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {events.map((event) => (
          <article
            key={event.id}
            className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-7 backdrop-blur-sm transition-all duration-300 hover:border-brand/60 hover:shadow-[0_0_36px_rgba(225,6,0,0.24)]"
          >
            <div
              className="h-32 rounded-xl"
              style={{
                background: "linear-gradient(160deg, rgba(225,6,0,0.35), rgba(10,10,11,0.9))",
              }}
            />
            <h3 className="font-display text-2xl font-bold text-white">{event.title}</h3>
            <p className="text-sm leading-relaxed text-white/50">
              {event.date} · {event.location} · {event.menu}
            </p>
            <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4">
              <span className="font-display text-xl font-bold text-white">{event.price} €</span>
              <span className="rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs text-brand-light">
                {event.spotsLeft} places
              </span>
            </div>
            <button
              onClick={() => setActive(event)}
              className="rounded-full bg-brand py-3 text-sm font-semibold uppercase tracking-wide text-white transition-transform hover:scale-[1.01]"
            >
              Reservar plaça
            </button>
          </article>
        ))}
      </div>

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
