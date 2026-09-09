import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section, Bullets } from "@/components/legal/LegalPage";
import { CLUB, ADRECA_COMPLETA } from "@/lib/legal";
import { STRIPE_PERCENT, STRIPE_FIXED_EUR, ROUNDING_STEP_EUR } from "@/lib/fees";

export const metadata: Metadata = {
  title: "Condicions de compra — Club Futbol Juneda",
  description:
    "Condicions de contractació de les entrades, el material esportiu i les quotes de soci del Club Futbol Juneda.",
};

export default function CondicionsPage() {
  const percent = (STRIPE_PERCENT * 100).toString().replace(".", ",");
  const fix = STRIPE_FIXED_EUR.toFixed(2).replace(".", ",");
  const pas = ROUNDING_STEP_EUR.toFixed(2).replace(".", ",");

  return (
    <LegalPage
      title="Condicions de compra"
      intro="Condicions generals de contractació a distància, d'acord amb el Reial decret legislatiu 1/2007, de defensa dels consumidors i usuaris."
    >
      <Section title="Qui ven">
        <p>
          {CLUB.nom}, amb NIF {CLUB.nif} i domicili a {ADRECA_COMPLETA}. Per a qualsevol
          consulta sobre una comanda:{" "}
          <a href={`mailto:${CLUB.email}`} className="text-brand hover:underline">
            {CLUB.email}
          </a>
          .
        </p>
      </Section>

      <Section title="Què es pot contractar">
        <Bullets
          items={[
            <>
              <strong>Entrades</strong> per a sopars, dinars i actes socials del club, amb data
              i lloc determinats.
            </>,
            <>
              <strong>Material esportiu</strong> de la botiga oficial, amb recollida a les
              instal·lacions del club.
            </>,
            <>
              <strong>Quotes de soci</strong>, que <strong>no es paguen per aquest web</strong>:
              el formulari només recull l&apos;alta i la Junta domicilia la quota al compte que
              hi has autoritzat.
            </>,
          ]}
        />
      </Section>

      <Section title="Preus i despeses de gestió">
        <p>
          Els preus s&apos;expressen en euros. Les compres en línia porten unes{" "}
          <strong>despeses de gestió</strong> que cobreixen el cost del servei de compra en
          línia (reserva, confirmació automàtica i gestió del registre). Es calculen sobre
          l&apos;import de la comanda com el {percent} % més {fix} €, arrodonit cap amunt a
          múltiples de {pas} €, i s&apos;apliquen igual sigui quin sigui el mitjà de pagament
          que triïs.
        </p>
        <p>
          L&apos;import surt <strong>desglossat i sumat al total abans de pagar</strong>, tant
          al resum de la comanda com a la pàgina de pagament. No hi ha cap altre càrrec: no
          apliquem despeses d&apos;enviament perquè les comandes es recullen al club.
        </p>
      </Section>

      <Section title="Com es compra i com es paga">
        <p>
          Un cop omplert el formulari, el botó indica sempre l&apos;import total a pagar. En
          prémer-lo se&apos;t redirigeix a la passarel·la segura de{" "}
          <strong>Stripe Payments Europe, Ltd.</strong>, on pots pagar amb targeta, Bizum,
          Apple Pay o Google Pay segons el teu dispositiu. El club no arriba a veure ni a
          desar en cap moment les dades de la teva targeta.
        </p>
        <p>
          La compra queda formalitzada quan Stripe confirma el pagament. Llavors reps un
          correu de confirmació a l&apos;adreça que hagis indicat. Si no et rep, revisa la
          carpeta de correu brossa i escriu-nos.
        </p>
      </Section>

      <Section title="Dret de desistiment: llegeix-ho abans de comprar">
        <p>
          Com a consumidor tens dret a desistir d&apos;una compra a distància en el termini de{" "}
          <strong>14 dies naturals</strong> sense justificació. Ara bé, la llei preveu
          excepcions que afecten bona part del que venem:
        </p>
        <Bullets
          items={[
            <>
              <strong>Entrades per a sopars, dinars i actes amb data concreta:</strong> no hi ha
              dret de desistiment, perquè són serveis de lleure prestats en una data
              determinada (art. 103.l del RDL 1/2007).
            </>,
            <>
              <strong>Material personalitzat</strong> (per exemple, una samarreta amb el dorsal
              que has triat): no hi ha dret de desistiment, perquè es confecciona expressament
              per a tu (art. 103.c del RDL 1/2007).
            </>,
            <>
              <strong>Material sense personalitzar:</strong> sí que tens els 14 dies. Cal que ens
              ho comuniquis a{" "}
              <a href={`mailto:${CLUB.email}`} className="text-brand hover:underline">
                {CLUB.email}
              </a>{" "}
              i que la peça estigui sense usar i amb l&apos;etiqueta posada.
            </>,
          ]}
        />
        <p>
          Si no pots assistir a un acte, escriu-nos igualment: el club mira de reubicar
          l&apos;entrada sempre que sigui possible, encara que no hi estigui obligat.
        </p>
      </Section>

      <Section title="Cancel·lació d'un acte pel club">
        <p>
          Si el club anul·la un acte, es retorna l&apos;import íntegre de les entrades,
          despeses de gestió incloses, pel mateix mitjà de pagament que vas fer servir. Si es
          canvia la data, pots optar entre mantenir l&apos;entrada o demanar-ne la devolució.
        </p>
      </Section>

      <Section title="Quotes de soci i domiciliació">
        <p>
          L&apos;alta de soci no comporta cap pagament en aquest web. En enviar el formulari
          autoritzes el {CLUB.nom} a enviar ordres al teu banc perquè carregui al teu compte
          la quota anual de la modalitat que has triat, i autoritzes el banc a fer-ho
          (mandat de domiciliació SEPA).
        </p>
        <Bullets
          items={[
            "El càrrec és anual i correspon a la temporada indicada al formulari.",
            "Pots donar-te de baixa escrivint al club abans que s'emeti la remesa de la temporada següent.",
            "Com a client bancari tens dret al reemborsament pel teu banc segons el contracte que hi tinguis. Per a un càrrec autoritzat, el pots sol·licitar en els 8 setmanes següents a la data del càrrec.",
            "Les teves dades bancàries es fan servir únicament per a aquest cobrament.",
          ]}
        />
      </Section>

      <Section title="Atenció i reclamacions">
        <p>
          Per a qualsevol incidència, escriu a{" "}
          <a href={`mailto:${CLUB.email}`} className="text-brand hover:underline">
            {CLUB.email}
          </a>
          . Ens comprometem a respondre en el termini més breu possible.
        </p>
      </Section>

      <Section title="Protecció de dades">
        <p>
          El tractament de les dades que ens facilites es descriu a la{" "}
          <Link href="/privacitat" className="text-brand hover:underline">
            política de privacitat
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
