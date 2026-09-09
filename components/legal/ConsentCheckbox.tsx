"use client";

import { Check } from "lucide-react";

/**
 * Casella de consentiment dels formularis de compra i d'alta.
 *
 * Deliberadament sense marcar per defecte: un consentiment premarcat no es
 * valid ni com a acceptacio de condicions ni, encara menys, per a les dades de
 * salut de l'article 9 del RGPD. Qui l'ha de marcar es l'usuari.
 */
export function ConsentCheckbox({
  checked,
  onChange,
  children,
  id,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-3.5 text-xs leading-relaxed text-white/70 transition-colors hover:border-white/25"
    >
      <span className="relative mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-[18px] w-[18px] shrink-0 appearance-none rounded border border-white/25 bg-black/50 outline-none transition-colors checked:border-brand checked:bg-brand focus-visible:ring-2 focus-visible:ring-brand/50"
        />
        <Check
          size={12}
          strokeWidth={3.5}
          className="pointer-events-none absolute text-white opacity-0 transition-opacity peer-checked:opacity-100"
        />
      </span>
      <span>{children}</span>
    </label>
  );
}

/** Enllaç a una pàgina legal des de dins d'un formulari, sense perdre'n l'estat. */
export function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      // El formulari es dins d'un modal: obrir a la mateixa pestanya faria
      // perdre tot el que l'usuari ja ha escrit.
      onClick={(e) => e.stopPropagation()}
      className="text-brand underline underline-offset-2 hover:text-brand-light"
    >
      {children}
    </a>
  );
}
