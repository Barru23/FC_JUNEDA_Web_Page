"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BusFront,
  CalendarDays,
  Clock3,
  Home,
  MapPin,
} from "lucide-react";
import {
  formatMatchDate,
  getCataloniaDateKey,
  getNextMatch,
  leagueMatches,
  matchTeams,
  type LeagueMatch,
  type MatchVenue,
} from "@/lib/matches";

type MatchFilter = "all" | MatchVenue;

const FILTERS: { value: MatchFilter; label: string }[] = [
  { value: "all", label: "Tots" },
  { value: "home", label: "Casa" },
  { value: "away", label: "Fora" },
];

function MatchRow({ match, isNext }: { match: LeagueMatch; isNext: boolean }) {
  const [homeTeam, awayTeam] = matchTeams(match);
  const atHome = match.venue === "home";
  const VenueIcon = atHome ? Home : BusFront;

  return (
    <li
      className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 rounded-xl border p-4 transition-colors sm:grid-cols-[64px_1fr_auto] sm:items-center ${
        isNext
          ? "border-brand/50 bg-brand/10 shadow-[0_0_26px_rgba(225,6,0,0.12)]"
          : "border-white/10 bg-white/[0.025] hover:border-white/20"
      }`}
    >
      <div className="row-span-2 flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-black/30 sm:row-span-1 sm:h-12 sm:w-14">
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/35">Jornada</span>
        <span className="font-display text-lg font-extrabold text-white">{match.round}</span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm sm:text-base">
          <span className={homeTeam === "CF Juneda" ? "font-bold text-white" : "text-white/65"}>{homeTeam}</span>
          <span className="text-xs font-bold uppercase text-brand">vs</span>
          <span className={awayTeam === "CF Juneda" ? "font-bold text-white" : "text-white/65"}>{awayTeam}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
          <span className="flex items-center gap-1.5"><CalendarDays size={11} />{formatMatchDate(match.date)}</span>
          <span className="flex items-center gap-1.5"><Clock3 size={11} />{match.time} h</span>
        </div>
      </div>

      <div className="col-start-2 flex items-center gap-1.5 sm:col-start-auto">
        <VenueIcon size={12} className={atHome ? "text-brand" : "text-white/40"} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${atHome ? "text-brand" : "text-white/45"}`}>
          {atHome ? "Casa" : "Fora"}
        </span>
        {isNext && (
          <span className="ml-1 rounded-full bg-brand px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
            Pròxim
          </span>
        )}
      </div>
    </li>
  );
}

export function CalendarSection() {
  const [filter, setFilter] = useState<MatchFilter>("all");
  const today = useMemo(() => getCataloniaDateKey(), []);
  const nextMatch = useMemo(() => getNextMatch(leagueMatches, today), [today]);
  const visibleMatches = filter === "all"
    ? leagueMatches
    : leagueMatches.filter((match) => match.venue === filter);
  const firstLeg = visibleMatches.filter((match) => match.round <= 15);
  const secondLeg = visibleMatches.filter((match) => match.round > 15);

  return (
    <section id="calendari" className="relative z-10 scroll-mt-4 px-6 py-20 md:px-10">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Temporada 2026/27</span>
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">Calendari de Lliga</h2>
          </div>
        </div>

        {nextMatch ? (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            className="relative overflow-hidden rounded-3xl border border-brand/35 bg-gradient-to-br from-brand/25 via-surface to-black p-6 shadow-[0_0_50px_rgba(225,6,0,0.16)] sm:p-8"
          >
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-light">Pròxim partit · Jornada {nextMatch.round}</span>
                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-display text-3xl font-extrabold uppercase tracking-tight text-white sm:text-5xl">
                  <span>{matchTeams(nextMatch)[0]}</span>
                  <span className="text-lg text-brand sm:text-2xl">vs</span>
                  <span>{matchTeams(nextMatch)[1]}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm text-white/60 lg:items-end">
                <span className="flex items-center gap-2"><CalendarDays size={15} className="text-brand" />{formatMatchDate(nextMatch.date)}</span>
                <span className="flex items-center gap-2"><Clock3 size={15} className="text-brand" />{nextMatch.time} h</span>
                <span className="flex items-center gap-2"><MapPin size={15} className="text-brand" />{nextMatch.venue === "home" ? "ZEM de Juneda" : "Fora de casa"}</span>
              </div>
            </div>
          </motion.article>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-white/55">
            La temporada 2026/27 ha finalitzat. Consulta totes les jornades a continuació.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-white/45">30 jornades · Segona Catalana, Grup 5</p>
          <div className="flex rounded-full border border-white/10 bg-black/30 p-1" aria-label="Filtrar partits">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  filter === item.value ? "bg-brand text-white" : "text-white/45 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          {[
            { title: "Primera volta", matches: firstLeg },
            { title: "Segona volta", matches: secondLeg },
          ].map((leg) => (
            <div key={leg.title}>
              <h3 className="mb-3 font-display text-lg font-bold uppercase tracking-tight text-white/80">{leg.title}</h3>
              <ol className="flex flex-col gap-2">
                {leg.matches.map((match) => (
                  <MatchRow key={match.round} match={match} isNext={match.round === nextMatch?.round} />
                ))}
              </ol>
            </div>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-white/35">
          Dates segons el calendari oficial de la Federació Catalana de Futbol. Horari general: 17:00 h. Qualsevol canvi es comunicarà pels canals oficials del club.
        </p>
      </div>
    </section>
  );
}
