import matchesJson from "@/content/matches.json";

export type MatchVenue = "home" | "away";

export type LeagueMatch = {
  round: number;
  date: string;
  time: string;
  opponent: string;
  venue: MatchVenue;
};

export const leagueMatches = matchesJson as LeagueMatch[];

const matchDateFormatter = new Intl.DateTimeFormat("ca-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

/**
 * Parse a date-only value at noon so formatting never moves it to the previous
 * day in another runtime timezone.
 */
export function formatMatchDate(date: string): string {
  const formatted = matchDateFormatter.format(new Date(`${date}T12:00:00Z`));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Returns today's YYYY-MM-DD key in the club's local timezone. */
export function getCataloniaDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Madrid",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

/** A match remains upcoming throughout its calendar day because no final time
 * is supplied by the federation's source document. */
export function getNextMatch(
  matches: LeagueMatch[] = leagueMatches,
  today = getCataloniaDateKey()
): LeagueMatch | undefined {
  return matches.find((match) => match.date >= today);
}

export function matchTeams(match: LeagueMatch): [string, string] {
  return match.venue === "home"
    ? ["CF Juneda", match.opponent]
    : [match.opponent, "CF Juneda"];
}
