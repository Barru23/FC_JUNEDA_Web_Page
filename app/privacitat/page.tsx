import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, DataRow, Bullets } from "@/components/legal/LegalPage";
import { CLUB, ADRECA_COMPLETA, CONSERVACIO } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacitat — Club Futbol Juneda",
  description: "Com tracta el Club Futbol Juneda les dades personals dels socis i compradors.",
  alternates: { canonical: "/privacitat" },
};

export default function PrivacitatPage() {
  return (
    <LegalPage
      title="Política de privacitat"
      intro="Informació sobre el tractament de dades personals, d'acord amb el Reglament (UE) 2016/679 (RGPD) i la Llei orgànica 3/2018 (LOPDGDD)."
    >
      <Section title="Qui tracta les teves dades">
        <div className="flex flex-col">
          <DataRow label="Responsable" value={CLUB.nom} />
          <DataRow label="NIF" value={CLUB.nif} />
          <DataRow label="Adreça" value={ADRECA_COMPLETA} />
          <DataRow
            label="Contacte"
            value={
              <a href={`mailto:${CLUB.email}`} className="text-brand hover:underline">
                {CLUB.email}
              </a>
            }
          />
        </div>
      </Section>

      <Section title="Quines dades recollim i per a què">
        <p className="text-white/90">Entrades per a actes socials (sopars, dinars, festes)</p>
        <Bullets
          items={[
            "Nom i cognoms, correu electrònic i telèfon, per gestionar la reserva i enviar-te la confirmació.",
            "Nombre de tiquets i requeriments dietètics, per organitzar el servei de menjar.",
            "Base legal: l'execució del contracte de compra (art. 6.1.b RGPD).",
          ]}
        />

        <p className="mt-4 text-white/90">Botiga</p>
        <Bullets
          items={[
            "Nom i cognoms, correu electrònic i telèfon, talla i personalització, per preparar la comanda i avisar-te de la recollida.",
            "Base legal: l'execució del contracte de compra (art. 6.1.b RGPD).",
          ]}
        />

        <p className="mt-4 text-white/90">Altes de soci</p>
        <Bullets
          items={[
            "Nom i cognoms, DNI o NIE, correu electrònic i telèfon, per acreditar la condició de soci i comunicar-nos amb tu.",
            "Número de compte (IBAN), amb l'única finalitat de domiciliar la quota anual que has autoritzat.",
            "Base legal: l'execució de la relació de soci i el mandat de domiciliació que acceptes en el formulari (art. 6.1.b RGPD).",
          ]}
        />
      </Section>

      <Section title="Requeriments dietètics: consentiment explícit">
        <p>
          Quan reserves una entrada per a un àpat pots indicar-nos un requeriment dietètic.
          Algunes d&apos;aquestes opcions —com ara &laquo;sense gluten&raquo; o &laquo;sense
          làctics&raquo;— poden revelar informació sobre la teva salut, que el RGPD tracta
          com a categoria especial de dades (art. 9).
        </p>
        <p>
          Per aquest motiu et demanem el consentiment explícit abans de pagar, i fem servir
          aquesta informació <strong>només</strong> per comunicar el nombre de menús
          especials al servei de càtering. Pots deixar l&apos;opció per defecte
          (&laquo;cap intolerància&raquo;) si prefereixes no dir-nos-ho i comentar-ho
          directament al restaurant.
        </p>
      </Section>

      <Section title="Amb qui les compartim">
        <p>
          No venem ni cedim les teves dades a tercers amb finalitats comercials. Les
          compartim únicament amb els proveïdors que ens permeten prestar el servei, que
          actuen com a encarregats del tractament:
        </p>
        <Bullets
          items={[
            <>
              <strong>Stripe Payments Europe, Ltd.</strong> — passarel·la de pagament. El club
              no arriba a veure ni a desar mai les dades de la teva targeta.
            </>,
            <>
              <strong>Google (Workspace)</strong> — full de càlcul i correu de confirmació de
              la Junta.
            </>,
            <>
              <strong>Supabase</strong> — base de dades del web.
            </>,
            <>
              <strong>Vercel</strong> — allotjament del web.
            </>,
          ]}
        />
        <p>
          També podem comunicar dades a l&apos;entitat bancària del club per executar la
          domiciliació de la quota de soci, i a les administracions públiques quan una llei
          ens hi obligui.
        </p>
      </Section>

      <Section title="Quant de temps les conservem">
        <p>
          Conservem les dades durant <strong>{CONSERVACIO}</strong>, mentre es manté la
          relació amb el club. Un cop finalitzada, les bloquegem durant els terminis de
          prescripció legal (comptable i fiscal) i després les suprimim.
        </p>
      </Section>

      <Section title="Els teus drets">
        <p>
          Pots exercir en qualsevol moment els drets d&apos;accés, rectificació, supressió,
          oposició, limitació del tractament i portabilitat, i retirar el consentiment que
          hagis donat. Només cal que escriguis a{" "}
          <a href={`mailto:${CLUB.email}`} className="text-brand hover:underline">
            {CLUB.email}
          </a>{" "}
          indicant quin dret vols exercir.
        </p>
        <p>
          Si consideres que no hem atès la teva sol·licitud correctament, pots presentar una
          reclamació davant l&apos;Agència Espanyola de Protecció de Dades (
          <a
            href="https://www.aepd.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand hover:underline"
          >
            www.aepd.es
          </a>
          ) o l&apos;Autoritat Catalana de Protecció de Dades.
        </p>
      </Section>

      <Section title="Galetes (cookies)">
        <p>
          Aquest web <strong>no fa servir galetes analítiques, publicitàries ni de
          seguiment</strong>, i no incorpora eines com Google Analytics ni píxels de xarxes
          socials. Només utilitzem emmagatzematge tècnic imprescindible per mantenir la
          sessió del panell d&apos;administració del club. Per això no et mostrem cap
          finestra de consentiment de galetes: no en necessitem.
        </p>
      </Section>

      <Section title="Menors d'edat">
        <p>
          Per donar d&apos;alta un menor com a soci cal que ho faci el pare, la mare o qui en
          tingui la tutela legal, que és qui facilita les dades i autoritza la domiciliació.
        </p>
      </Section>

      <Section title="Més informació">
        <p>
          Consulta també l&apos;{" "}
          <Link href="/avis-legal" className="text-brand hover:underline">
            avís legal
          </Link>{" "}
          i les{" "}
          <Link href="/condicions-compra" className="text-brand hover:underline">
            condicions de compra
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
