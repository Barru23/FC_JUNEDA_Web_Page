export type ClubEvent = {
  id: string;
  title: string;
  date: string;
  location: string;
  menu: string;
  price: number;
  spotsLeft: number;
};

export type Product = {
  id: string;
  name: string;
  sizes: string[];
  price: number;
  swatches: string[];
  customizable: boolean;
  image?: string;
};

export type Position = "Porters" | "Defenses" | "Migcampistes" | "Davanters" | "Cos Tècnic";

export type Player = {
  id: string;
  name: string;
  number: number;
  position: Position;
  bio: string;
};

// SAMPLE data — substituir per contingut real del club / CMS.
export const events: ClubEvent[] = [
  {
    id: "sopar-temporada",
    title: "Sopar de Temporada",
    date: "28 de setembre",
    location: "Pavelló Municipal",
    menu: "Menú 3 plats + postres",
    price: 18,
    spotsLeft: 14,
  },
  {
    id: "dinar-final",
    title: "Dinar de Final de Lliga",
    date: "14 de juny",
    location: "Casal del Club",
    menu: "Menú tradicional català",
    price: 22,
    spotsLeft: 32,
  },
];

export const products: Product[] = [
  {
    id: "1a-equipacio",
    name: "1a Equipació Vermella",
    sizes: ["S", "M", "L", "XL", "Nen/a"],
    price: 39.9,
    swatches: ["#E10600", "#0A0A0B", "#FBBF24"],
    customizable: true,
    image: "/data/Samarretes.jpeg",
  },
  {
    id: "2a-equipacio",
    name: "2a Equipació",
    sizes: ["S", "M", "L", "XL", "Nen/a"],
    price: 39.9,
    swatches: ["#0F172A", "#FBBF24"],
    customizable: true,
  },
  {
    id: "bufanda",
    name: "Bufanda Oficial",
    sizes: ["Única"],
    price: 14.9,
    swatches: ["#E10600", "#0A0A0B"],
    customizable: false,
  },
];

// SAMPLE data — substituir per la plantilla real.
export const players: Player[] = [
  { id: "p9", name: "Marc Rovira", number: 9, position: "Davanters", bio: "Golejador nat, capità de l'atac des de fa tres temporades." },
  { id: "p1", name: "Jordi Solé", number: 1, position: "Porters", bio: "Porter titular, reflexos clau en el joc aeri." },
  { id: "p4", name: "Pau Ferrer", number: 4, position: "Defenses", bio: "Central contundent, líder de la defensa." },
  { id: "p8", name: "Adrià Costa", number: 8, position: "Migcampistes", bio: "Motor del mig del camp, visió de joc excepcional." },
  { id: "p11", name: "Nil Bosch", number: 11, position: "Davanters", bio: "Extrem ràpid, especialista en centres precisos." },
  { id: "p6", name: "Toni Vidal", number: 6, position: "Cos Tècnic", bio: "Segon entrenador, responsable de la preparació física." },
];
