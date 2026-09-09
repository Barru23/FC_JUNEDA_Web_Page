import Link from "next/link";
import { Crest } from "@/components/Crest";
import { CLUB, ADRECA_COMPLETA } from "@/lib/legal";

const ENLLACOS = [
  { href: "/avis-legal", label: "Avís legal" },
  { href: "/privacitat", label: "Política de privacitat" },
  { href: "/condicions-compra", label: "Condicions de compra" },
];

/**
 * Peu de pagina. Mes enlla del disseny, la LSSI obliga a tenir les dades
 * identificatives del titular accessibles des de qualsevol pagina, i les
 * condicions de compra han de poder consultar-se abans de comprar.
 */
export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Crest className="h-10 w-7 shrink-0" />
          <div className="text-xs leading-relaxed text-white/45">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-white/70">
              {CLUB.nom}
            </p>
            <p className="mt-1">NIF {CLUB.nif}</p>
            <p>{ADRECA_COMPLETA}</p>
            <a href={`mailto:${CLUB.email}`} className="transition-colors hover:text-brand">
              {CLUB.email}
            </a>
          </div>
        </div>

        <nav className="flex flex-col gap-2 text-xs">
          {ENLLACOS.map((enllac) => (
            <Link
              key={enllac.href}
              href={enllac.href}
              className="text-white/45 transition-colors hover:text-brand"
            >
              {enllac.label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="mx-auto mt-8 max-w-6xl text-[11px] text-white/25">
        © {new Date().getFullYear()} {CLUB.nom}. Entitat esportiva sense ànim de lucre.
      </p>
    </footer>
  );
}
