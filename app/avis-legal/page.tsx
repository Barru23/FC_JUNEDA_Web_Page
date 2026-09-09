import type { Metadata } from "next";
import { LegalPage, Section, DataRow } from "@/components/legal/LegalPage";
import { CLUB, ADRECA_COMPLETA } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Avís legal — Club Futbol Juneda",
  description: "Dades identificatives i condicions d'ús del web del Club Futbol Juneda.",
};

export default function AvisLegalPage() {
  return (
    <LegalPage
      title="Avís legal"
      intro="Dades identificatives del titular d'aquest web, en compliment de l'article 10 de la Llei 34/2002, de serveis de la societat de la informació i de comerç electrònic (LSSI-CE)."
    >
      <Section title="Titular del web">
        <div className="flex flex-col">
          <DataRow label="Denominació" value={CLUB.nom} />
          <DataRow label="NIF" value={CLUB.nif} />
          <DataRow label="Domicili" value={ADRECA_COMPLETA} />
          <DataRow
            label="Correu electrònic"
            value={
              <a href={`mailto:${CLUB.email}`} className="text-brand hover:underline">
                {CLUB.email}
              </a>
            }
          />
          <DataRow label="Activitat" value="Entitat esportiva sense ànim de lucre" />
        </div>
      </Section>

      <Section title="Objecte">
        <p>
          Aquest web és el canal oficial del {CLUB.nom} per informar de l&apos;activitat del
          club i per gestionar la venda d&apos;entrades per a actes socials, la venda de
          material esportiu i les altes de socis i sòcies.
        </p>
      </Section>

      <Section title="Condicions d'ús">
        <p>
          L&apos;accés a aquest web és gratuït i implica acceptar aquest avís legal.
          L&apos;usuari es compromet a fer-ne un ús conforme a la llei i a no introduir dades
          falses o de terceres persones sense el seu consentiment. Concretament, en fer-se
          soci o comprar una entrada cal facilitar dades pròpies i certes.
        </p>
        <p>
          El club es reserva el dret de modificar els continguts del web, els preus i la
          disponibilitat d&apos;entrades i de productes sense avís previ, sempre respectant
          les comandes ja confirmades.
        </p>
      </Section>

      <Section title="Propietat intel·lectual">
        <p>
          L&apos;escut, el nom, les imatges i els continguts d&apos;aquest web pertanyen al{" "}
          {CLUB.nom} o s&apos;hi utilitzen amb autorització. No se&apos;n permet la
          reproducció amb finalitats comercials sense permís escrit del club.
        </p>
      </Section>

      <Section title="Responsabilitat">
        <p>
          El club procura que la informació publicada sigui exacta i estigui actualitzada,
          però no es fa responsable de les interrupcions del servei, dels errors tècnics ni
          dels danys que puguin derivar-se de l&apos;ús del web quan siguin aliens al seu
          control.
        </p>
      </Section>

      <Section title="Legislació aplicable">
        <p>
          Aquest avís legal es regeix per la legislació espanyola. Per a qualsevol
          controvèrsia, les parts se sotmeten als jutjats i tribunals que corresponguin
          segons la normativa de consumidors i usuaris.
        </p>
      </Section>
    </LegalPage>
  );
}
