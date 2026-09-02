// lib/squad.ts

// ── Tipus ──────────────────────────────────────────────

/** Posicions de joc (en català, coherent amb el projecte) */
export type SquadPosition = "Porters" | "Defenses" | "Migcampistes" | "Davanters";

/** Rols del cos tècnic */
export type StaffRole = "Entrenador" | "Segon Entrenador" | "Fisioterapeuta" | "Delegat";

/** Jugador de la plantilla */
export interface SquadPlayer {
  id: string;           // Identificador únic (ex: "gk-1")
  name: string;         // Nom complet
  number: number;       // Dorsal
  position: SquadPosition;
  starter: boolean;     // TRUE = titular a la formació 4-3-3 inicial
  role?: string;        // Subrol específic (ex: "Central", "Extrem", "Lateral Dret")
  photo?: string;       // Ruta a la foto (futur)
  bio?: string;
}

/** Membre del cos tècnic */
export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  photo?: string;
  bio?: string;
}

export interface SquadData {
  season: string;
  formation: string;
  players: SquadPlayer[];
  staff: StaffMember[];
}

// ── Dades de la plantilla (Temporada 25/26) ─────────────

export const squad: SquadData = {
  season: "2025/2026",
  formation: "4-3-3",
  players: [
    // ── Porters (3: 1 titular, 2 suplents) ───────────────
    {
      id: "gk-1",
      name: "Jordi Solé",
      number: 1,
      position: "Porters",
      starter: true,
      role: "Porter Titular",
      bio: "Seguretat sota pals i gran reflex en el joc aeri.",
    },
    {
      id: "gk-13",
      name: "Àlex Graus",
      number: 13,
      position: "Porters",
      starter: false,
      role: "Porter Suplent",
      bio: "Jove promesa del planter amb agilitat felina.",
    },
    {
      id: "gk-25",
      name: "Pol Masana",
      number: 25,
      position: "Porters",
      starter: false,
      role: "Tercer Porter",
      bio: "Experiència i compromís amb el vestidor roig.",
    },

    // ── Defenses (7: 4 titulars, 3 suplents) ─────────────
    {
      id: "df-2",
      name: "Dani Miró",
      number: 2,
      position: "Defenses",
      starter: true,
      role: "Lateral Dret",
      bio: "Velocitat per la banda dreta i gran desplegament físic.",
    },
    {
      id: "df-4",
      name: "Pau Ferrer",
      number: 4,
      position: "Defenses",
      starter: true,
      role: "Defensa Central",
      bio: "Central contundent, lideratge defensiu i autoritat.",
    },
    {
      id: "df-5",
      name: "Guillem Pons",
      number: 5,
      position: "Defenses",
      starter: true,
      role: "Defensa Central",
      bio: "Especialista en tall net i bona sortida de pilota.",
    },
    {
      id: "df-3",
      name: "Sergi Balcells",
      number: 3,
      position: "Defenses",
      starter: true,
      role: "Lateral Esquerre",
      bio: "Carreril esquerrà incansable amb arribada a l'àrea.",
    },
    {
      id: "df-12",
      name: "Marc Sendra",
      number: 12,
      position: "Defenses",
      starter: false,
      role: "Lateral Dret",
      bio: "Defensa polivalent capaç de cobrir qualsevol flanc.",
    },
    {
      id: "df-15",
      name: "Arnau Ribes",
      number: 15,
      position: "Defenses",
      starter: false,
      role: "Central",
      bio: "Joc aeri dominant a les dues àrees.",
    },
    {
      id: "df-18",
      name: "Oriol Gomis",
      number: 18,
      position: "Defenses",
      starter: false,
      role: "Lateral Esquerre",
      bio: "Tècnica i disciplina tàctica defensiva.",
    },

    // ── Migcampistes (6: 3 titulars, 3 suplents) ──────────
    {
      id: "mf-6",
      name: "Xavi Roigé",
      number: 6,
      position: "Migcampistes",
      starter: true,
      role: "Pivot Defensiu",
      bio: "L'àncora de l'equip. Equilibri i recuperació de pilotes.",
    },
    {
      id: "mf-8",
      name: "Adrià Costa",
      number: 8,
      position: "Migcampistes",
      starter: true,
      role: "Interior Dret",
      bio: "Visió de joc privilegiada i darrer passi decisiu.",
    },
    {
      id: "mf-10",
      name: "Gerard Vilalta",
      number: 10,
      position: "Migcampistes",
      starter: true,
      role: "Interior Esquerre",
      bio: "Capità i metrònom del ritme de joc junedenc.",
    },
    {
      id: "mf-14",
      name: "Biel Carbonell",
      number: 14,
      position: "Migcampistes",
      starter: false,
      role: "Migcampista",
      bio: "Treball infatigable en la pressió alta.",
    },
    {
      id: "mf-16",
      name: "Roger Farré",
      number: 16,
      position: "Migcampistes",
      starter: false,
      role: "Migcampista Ofensiu",
      bio: "Arribada des de segona línia amb xut potent.",
    },
    {
      id: "mf-20",
      name: "Carles Prats",
      number: 20,
      position: "Migcampistes",
      starter: false,
      role: "Migcampista",
      bio: "Criteri tàctic i distribució ràpida del joc.",
    },

    // ── Davanters (6: 3 titulars, 3 suplents) ─────────────
    {
      id: "fw-7",
      name: "Eduard Pujol",
      number: 7,
      position: "Davanters",
      starter: true,
      role: "Extrem Dret",
      bio: "Desbordament elèctric i gran capacitat de centre.",
    },
    {
      id: "fw-9",
      name: "Marc Rovira",
      number: 9,
      position: "Davanters",
      starter: true,
      role: "Davanter Centre",
      bio: "Golejador de referència, olfacte dins l'àrea i caràcter.",
    },
    {
      id: "fw-11",
      name: "Nil Bosch",
      number: 11,
      position: "Davanters",
      starter: true,
      role: "Extrem Esquerre",
      bio: "Regateig en curt i definició clínica al segon pal.",
    },
    {
      id: "fw-17",
      name: "Aleix Font",
      number: 17,
      position: "Davanters",
      starter: false,
      role: "Davanter",
      bio: "Mobilitat constant per descol·locar centrals rivals.",
    },
    {
      id: "fw-19",
      name: "David Martí",
      number: 19,
      position: "Davanters",
      starter: false,
      role: "Extrem",
      bio: "Verticalitat pura i especialista en transicions ràpides.",
    },
    {
      id: "fw-21",
      name: "Joan Casals",
      number: 21,
      position: "Davanters",
      starter: false,
      role: "Davanter Centre",
      bio: "Joc d'esquena porteria i potència en rematades.",
    },
  ],

  // ── Cos Tècnic ──────────────────────────────────────────
  staff: [
    {
      id: "staff-1",
      name: "Albert Morales",
      role: "Entrenador",
      bio: "Primer entrenador, arquitecte del model competitiu roig.",
    },
    {
      id: "staff-2",
      name: "Toni Vidal",
      role: "Segon Entrenador",
      bio: "Estratègia tàctica a pilota parada i preparació física.",
    },
    {
      id: "staff-3",
      name: "Marta Casanovas",
      role: "Fisioterapeuta",
      bio: "Recuperació muscular i prevenció de lesions.",
    },
    {
      id: "staff-4",
      name: "Ramon Soler",
      role: "Delegat",
      bio: "Coordinació d'equip i representant oficial en acta.",
    },
  ],
};

// ── Helpers ────────────────────────────────────────────

/** Retorna els titulars d'una posició (els que surten a la formació inicial) */
export function getStartersByPosition(pos: SquadPosition): SquadPlayer[] {
  return squad.players.filter((p) => p.position === pos && p.starter);
}

/** Retorna TOTS els jugadors d'una posició (titulars + suplents) */
export function getAllByPosition(pos: SquadPosition): SquadPlayer[] {
  return squad.players.filter((p) => p.position === pos);
}

/** Retorna el cos tècnic */
export function getStaff(): StaffMember[] {
  return squad.staff;
}

/** Totes les posicions ordenades de porter a davanter */
export const POSITIONS: SquadPosition[] = [
  "Porters",
  "Defenses",
  "Migcampistes",
  "Davanters",
];
