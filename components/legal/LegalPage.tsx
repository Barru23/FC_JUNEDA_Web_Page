import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Crest } from "@/components/Crest";
import { ULTIMA_ACTUALITZACIO } from "@/lib/legal";

/**
 * Marc comu de les tres pagines legals. Deliberadament sobri i d'alt contrast:
 * aqui el que importa es que es llegeixi, no l'efecte visual de la portada.
 */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 md:px-8 md:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/40 transition-colors hover:text-brand"
      >
        <ArrowLeft size={14} /> Tornar a l&apos;inici
      </Link>

      <div className="mt-8 flex items-center gap-4">
        <Crest className="h-12 w-8 shrink-0" />
        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
          {title}
        </h1>
      </div>

      {intro && <p className="mt-4 text-sm leading-relaxed text-white/60">{intro}</p>}

      <p className="mt-2 text-xs text-white/35">
        Darrera actualització: {ULTIMA_ACTUALITZACIO}
      </p>

      <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed text-white/75">
        {children}
      </div>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-bold uppercase tracking-wide text-white">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Fila d'una taula de dades identificatives. */
export function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-white/10 py-2.5 sm:flex-row sm:gap-4">
      <span className="w-48 shrink-0 text-white/45">{label}</span>
      <span className="text-white/90">{value}</span>
    </div>
  );
}

export function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
