import { readFile } from "node:fs/promises";

const calendarUrl = new URL("../content/matches.json", import.meta.url);
const matches = JSON.parse(await readFile(calendarUrl, "utf8"));
const errors = [];

if (matches.length !== 30) errors.push(`S'esperaven 30 jornades i n'hi ha ${matches.length}.`);

const rounds = new Set();
const dates = new Set();
const opponents = new Map();

for (const [index, match] of matches.entries()) {
  if (match.round !== index + 1) errors.push(`La jornada ${index + 1} no està ordenada correctament.`);
  if (rounds.has(match.round)) errors.push(`La jornada ${match.round} està repetida.`);
  if (dates.has(match.date)) errors.push(`La data ${match.date} està repetida.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(match.date) || Number.isNaN(Date.parse(`${match.date}T12:00:00Z`))) {
    errors.push(`La jornada ${match.round} té una data ISO no vàlida.`);
  }
  if (new Date(`${match.date}T12:00:00Z`).getUTCDay() !== 0) {
    errors.push(`La jornada ${match.round} no cau en diumenge.`);
  }
  if (index > 0 && match.date <= matches[index - 1].date) {
    errors.push(`La jornada ${match.round} no està en ordre cronològic.`);
  }
  if (!['home', 'away'].includes(match.venue)) errors.push(`La jornada ${match.round} té un camp venue no vàlid.`);
  if (match.time !== "17:00") errors.push(`La jornada ${match.round} no té l'horari acordat de les 17:00.`);

  rounds.add(match.round);
  dates.add(match.date);
  const games = opponents.get(match.opponent) ?? [];
  games.push(match);
  opponents.set(match.opponent, games);
}

if (opponents.size !== 15) errors.push(`S'esperaven 15 rivals i n'hi ha ${opponents.size}.`);
for (const [opponent, games] of opponents) {
  const venues = new Set(games.map((game) => game.venue));
  if (games.length !== 2 || venues.size !== 2) {
    errors.push(`${opponent} ha de tenir exactament un partit a casa i un a fora.`);
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Calendari correcte: 30 jornades, 15 rivals i una anada/tornada per rival.");
