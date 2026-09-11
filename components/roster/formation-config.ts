import type { SquadPosition } from "@/lib/squad";

export interface FormationRowConfig {
  position: SquadPosition;
  label: string;
  baseX: number;
  formationZPositions: number[];
}

// Dades de disposicio sense cap import de Three.js. La llista HTML les pot
// reutilitzar sense arrossegar el motor 3D al paquet inicial de la portada.
export const FORMATION_CONFIG: FormationRowConfig[] = [
  { position: "Porters", label: "Porteria", baseX: -7.6, formationZPositions: [0] },
  { position: "Defenses", label: "Defensa", baseX: -4.4, formationZPositions: [-4.2, -1.4, 1.4, 4.2] },
  { position: "Migcampistes", label: "Mig del Camp", baseX: -0.6, formationZPositions: [-3.2, 0, 3.2] },
  { position: "Davanters", label: "Davantera", baseX: 3.8, formationZPositions: [-3.5, 0, 3.5] },
];
