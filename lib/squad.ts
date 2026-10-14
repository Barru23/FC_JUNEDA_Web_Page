// lib/squad.ts

// ── Tipus ──────────────────────────────────────────────

/** Posicions de joc (en català, coherent amb el projecte) */
export type SquadPosition = "Porters" | "Defenses" | "Migcampistes" | "Davanters";

/** Rols del cos tècnic */
export type StaffRole = "Entrenador" | "Preparador Físic" | "Fisioterapeuta" | "Delegat";

/** Jugador de la plantilla */
export interface SquadPlayer {
  id: string;           // Identificador únic (ex: "gk-1")
  slug: string;          // Coincideix amb public/cromos/<slug>.webp
  name: string;         // Nom complet (o sobrenom, tal com surt al cromo oficial)
  number: number;       // Dorsal
  position: SquadPosition;
  heightM: number;      // Alçada en metres
  town: string;         // Població d'origen, tal com surt al cromo
  photo: string;        // Ruta al cromo oficial (mida de camp)
  photo2x: string;      // Mateix cromo a 2x (panell ampliat)
  /** 1 = capità, 2 = primer suplent de capitania, etc. Només els 5 designats
   *  el tenen; la resta queda undefined. */
  captainRank?: number;
}

/** Membre del cos tècnic */
export interface StaffMember {
  id: string;
  slug: string;
  name: string;
  role: StaffRole;
  town: string;
  photo: string;
  photo2x: string;
}

export interface SquadData {
  season: string;
  players: SquadPlayer[];
  staff: StaffMember[];
}

function cromoPhoto(slug: string): string {
  return `/cromos/${slug}.webp`;
}
function cromoPhoto2x(slug: string): string {
  return `/cromos/${slug}@2x.webp`;
}

// ── Dades de la plantilla (Temporada 26/27) ─────────────
//
// Dorsals i dades esportives (alçada/posició/població) tal com
// consten als 30 cromos oficials del club — no s'ha inventat cap dada.
// No hi ha distinció titular/suplent: el club no n'ha fixat cap, i el camp
// 3D (FormationRow.tsx) mostra una línia sencera en desplegar-la en lloc
// d'un 4-3-3 fix.

export const squad: SquadData = {
  season: "2026/2027",
  players: [
    {
      id: "p-1",
      slug: "pol-cullere",
      name: "Pol Culleré",
      number: 1,
      position: "Porters",
      heightM: 1.87,
      town: "Mollerussa",
      photo: cromoPhoto("pol-cullere"),
      photo2x: cromoPhoto2x("pol-cullere"),
    },
    {
      id: "p-2",
      slug: "eric-lahuerta",
      name: "Eric Lahuerta",
      number: 2,
      position: "Migcampistes",
      heightM: 1.77,
      town: "Juneda",
      photo: cromoPhoto("eric-lahuerta"),
      photo2x: cromoPhoto2x("eric-lahuerta"),
      captainRank: 4,
    },
    {
      id: "p-3",
      slug: "reda-assiad",
      name: "Reda Assiad",
      number: 3,
      position: "Davanters",
      heightM: 1.75,
      town: "Juneda",
      photo: cromoPhoto("reda-assiad"),
      photo2x: cromoPhoto2x("reda-assiad"),
    },
    {
      id: "p-4",
      slug: "david-cusine",
      name: "David Cusiné",
      number: 4,
      position: "Defenses",
      heightM: 1.79,
      town: "Mollerussa",
      photo: cromoPhoto("david-cusine"),
      photo2x: cromoPhoto2x("david-cusine"),
    },
    {
      id: "p-5",
      slug: "marc-pifarre",
      name: "Marc Pifarré",
      number: 5,
      position: "Defenses",
      heightM: 1.81,
      town: "Les Borges Blanques",
      photo: cromoPhoto("marc-pifarre"),
      photo2x: cromoPhoto2x("marc-pifarre"),
      captainRank: 5,
    },
    {
      id: "p-6",
      slug: "santi-rodriguez",
      name: "Santi Rodríguez",
      number: 6,
      position: "Migcampistes",
      heightM: 1.69,
      town: "Mollerussa",
      photo: cromoPhoto("santi-rodriguez"),
      photo2x: cromoPhoto2x("santi-rodriguez"),
    },
    {
      id: "p-7",
      slug: "ivan-lahuerta",
      name: "Ivan Lahuerta",
      number: 7,
      position: "Defenses",
      heightM: 1.74,
      town: "Juneda",
      photo: cromoPhoto("ivan-lahuerta"),
      photo2x: cromoPhoto2x("ivan-lahuerta"),
    },
    {
      id: "p-8",
      slug: "adam-baja",
      name: "Adam Baja",
      number: 8,
      position: "Migcampistes",
      heightM: 1.83,
      town: "Mollerussa",
      photo: cromoPhoto("adam-baja"),
      photo2x: cromoPhoto2x("adam-baja"),
    },
    {
      id: "p-9",
      slug: "albert-capdevila",
      name: "Albert Capdevila",
      number: 9,
      position: "Davanters",
      heightM: 1.89,
      town: "Juneda",
      photo: cromoPhoto("albert-capdevila"),
      photo2x: cromoPhoto2x("albert-capdevila"),
    },
    {
      id: "p-10",
      slug: "oriol-tuto",
      name: "Oriol “Tuto”",
      number: 10,
      position: "Davanters",
      heightM: 1.78,
      town: "Juneda",
      photo: cromoPhoto("oriol-tuto"),
      photo2x: cromoPhoto2x("oriol-tuto"),
      captainRank: 3,
    },
    {
      id: "p-11",
      slug: "marcel-coixa",
      name: "Marcel “Coixa”",
      number: 11,
      position: "Davanters",
      heightM: 1.79,
      town: "Juneda",
      photo: cromoPhoto("marcel-coixa"),
      photo2x: cromoPhoto2x("marcel-coixa"),
      captainRank: 1,
    },
    {
      id: "p-12",
      slug: "carles-farrando",
      name: "Carles Farrando",
      number: 12,
      position: "Defenses",
      heightM: 1.81,
      town: "Juneda",
      photo: cromoPhoto("carles-farrando"),
      photo2x: cromoPhoto2x("carles-farrando"),
      captainRank: 2,
    },
    {
      id: "p-13",
      slug: "pol-morales",
      name: "Pol Morales",
      number: 13,
      position: "Porters",
      heightM: 1.72,
      town: "Gavà",
      photo: cromoPhoto("pol-morales"),
      photo2x: cromoPhoto2x("pol-morales"),
    },
    {
      id: "p-14",
      slug: "pol-farre",
      name: "Pol Farré",
      number: 14,
      position: "Defenses",
      heightM: 1.80,
      town: "Juneda",
      photo: cromoPhoto("pol-farre"),
      photo2x: cromoPhoto2x("pol-farre"),
    },
    {
      id: "p-15",
      slug: "nil-febrer",
      name: "Nil Febrer",
      number: 15,
      position: "Migcampistes",
      heightM: 1.68,
      town: "Ferreires",
      photo: cromoPhoto("nil-febrer"),
      photo2x: cromoPhoto2x("nil-febrer"),
    },
    {
      id: "p-16",
      slug: "sergi-sole",
      name: "Sergi Solé",
      number: 16,
      position: "Defenses",
      heightM: 1.77,
      town: "Les Borges Blanques",
      photo: cromoPhoto("sergi-sole"),
      photo2x: cromoPhoto2x("sergi-sole"),
    },
    {
      id: "p-17",
      slug: "ramon-sans",
      name: "Ramon Sans",
      number: 17,
      position: "Defenses",
      heightM: 1.75,
      town: "Arbeca",
      photo: cromoPhoto("ramon-sans"),
      photo2x: cromoPhoto2x("ramon-sans"),
    },
    {
      id: "p-18",
      slug: "lijarcio",
      name: "Lijarcio",
      number: 18,
      position: "Migcampistes",
      heightM: 1.78,
      town: "Torregrossa",
      photo: cromoPhoto("lijarcio"),
      photo2x: cromoPhoto2x("lijarcio"),
    },
    {
      id: "p-19",
      slug: "toni-mayoral",
      name: "Toni Mayoral",
      number: 19,
      position: "Davanters",
      heightM: 1.85,
      town: "Bell-lloc d’Urgell",
      photo: cromoPhoto("toni-mayoral"),
      photo2x: cromoPhoto2x("toni-mayoral"),
    },
    {
      id: "p-20",
      slug: "mateu-cabal",
      name: "Mateu Cabal",
      number: 20,
      position: "Migcampistes",
      heightM: 1.68,
      town: "Mollerussa",
      photo: cromoPhoto("mateu-cabal"),
      photo2x: cromoPhoto2x("mateu-cabal"),
    },
    {
      id: "p-21",
      slug: "xavi-sanchez",
      name: "Xavi Sánchez",
      number: 21,
      position: "Davanters",
      heightM: 1.71,
      town: "Les Borges Blanques",
      photo: cromoPhoto("xavi-sanchez"),
      photo2x: cromoPhoto2x("xavi-sanchez"),
    },
    {
      id: "p-22",
      slug: "zakaria-elabb",
      name: "Zakaria Elabb",
      number: 22,
      position: "Davanters",
      heightM: 1.73,
      town: "Juneda",
      photo: cromoPhoto("zakaria-elabb"),
      photo2x: cromoPhoto2x("zakaria-elabb"),
    },
    {
      id: "p-23",
      slug: "javier-beamud",
      name: "Javier Beamud",
      number: 23,
      position: "Defenses",
      heightM: 1.78,
      town: "Lleida",
      photo: cromoPhoto("javier-beamud"),
      photo2x: cromoPhoto2x("javier-beamud"),
    },
    {
      id: "p-24",
      slug: "jordi-usall",
      name: "Jordi Usall",
      number: 24,
      position: "Porters",
      heightM: 1.79,
      town: "Juneda",
      photo: cromoPhoto("jordi-usall"),
      photo2x: cromoPhoto2x("jordi-usall"),
    },
    {
      id: "p-25",
      slug: "ramon-bayona",
      name: "Ramon Bayona “Bayu”",
      number: 25,
      position: "Migcampistes",
      heightM: 1.74,
      town: "Mollerussa",
      photo: cromoPhoto("ramon-bayona"),
      photo2x: cromoPhoto2x("ramon-bayona"),
    },
  ],

  // ── Cos Tècnic ──────────────────────────────────────────
  staff: [
    {
      id: "staff-isaac",
      slug: "isaac-vidal",
      name: "Isaac Vidal",
      role: "Entrenador",
      town: "Artesa de Lleida",
      photo: cromoPhoto("isaac-vidal"),
      photo2x: cromoPhoto2x("isaac-vidal"),
    },
    {
      id: "staff-pau",
      slug: "pau-barrufet",
      name: "Pau Barrufet",
      role: "Entrenador",
      town: "Juneda",
      photo: cromoPhoto("pau-barrufet"),
      photo2x: cromoPhoto2x("pau-barrufet"),
    },
    {
      id: "staff-jan",
      slug: "jan-gelonch",
      name: "Jan Gelonch",
      role: "Preparador Físic",
      town: "Juneda",
      photo: cromoPhoto("jan-gelonch"),
      photo2x: cromoPhoto2x("jan-gelonch"),
    },
    {
      id: "staff-carla",
      slug: "carla-homs",
      name: "Carla Homs",
      role: "Fisioterapeuta",
      town: "Lleida",
      photo: cromoPhoto("carla-homs"),
      photo2x: cromoPhoto2x("carla-homs"),
    },
    {
      id: "staff-sergi",
      slug: "sergi-barrufet",
      name: "Sergi Barrufet",
      role: "Delegat",
      town: "Juneda",
      photo: cromoPhoto("sergi-barrufet"),
      photo2x: cromoPhoto2x("sergi-barrufet"),
    },
  ],
};

// ── Helpers ────────────────────────────────────────────

/** Retorna TOTS els jugadors d'una posició, ordenats per dorsal */
export function getAllByPosition(pos: SquadPosition): SquadPlayer[] {
  return squad.players.filter((p) => p.position === pos).sort((a, b) => a.number - b.number);
}

/** Retorna el cos tècnic */
export function getStaff(): StaffMember[] {
  return squad.staff;
}

/** Els 5 capitans designats, ordenats de 1r a 5è (esquerra a dreta al camp) */
export function getCaptains(): SquadPlayer[] {
  return squad.players
    .filter((p): p is SquadPlayer & { captainRank: number } => p.captainRank !== undefined)
    .sort((a, b) => a.captainRank - b.captainRank);
}

/** Totes les posicions ordenades de porter a davanter */
export const POSITIONS: SquadPosition[] = [
  "Porters",
  "Defenses",
  "Migcampistes",
  "Davanters",
];
