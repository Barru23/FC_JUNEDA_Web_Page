import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalitzaIdentificador, normalitzaDni, validaDni, validaIban } from "@/lib/identitat";
import { TERMS_VERSION } from "@/lib/legal";
import { limitRequest, readJson, RequestError, sameOrigin } from "@/lib/request-security";

// POST /api/socis — alta de soci SENSE pagament en linia.
//
// El soci no passa per Stripe: deixa les dades i la Junta fa la domiciliacio a
// ma. Per aixo la fila va a `soci_registrations` i no a `purchases`, que nomes
// recull cobraments ja fets: comptar una alta com a ingres inflaria les
// estadistiques amb diners que encara no han entrat.

function net(value: unknown, max = 200): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > max) throw new RequestError("Revisa la longitud i el format dels camps");
  return value.trim();
}

// Mateixa validacio laxa que el checkout: descartem nomes el que segur que no
// es una adreca, i qui decideix si existeix es el correu de confirmacio.
function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origen no autoritzat" }, { status: 403 });
  try {
    const limited = await limitRequest(req, "soci-signup", 10, 15 * 60);
    if (limited) return limited;
    const body = await readJson(req);
    if (body.website) throw new RequestError("No s'ha pogut validar el formulari");

    const nom = net(body.nom, 120);
    const email = net(body.email, 160);
    const telefon = net(body.telefon, 40);
    const dni = normalitzaDni(net(body.dni, 20));
    const iban = normalitzaIdentificador(net(body.iban, 40));
    const notes = net(body.notes, 500);
    const tierSlug = net(body.tierSlug, 80);
    const acceptaMandat = body.acceptaMandat === true;
    const acceptaCondicions = body.acceptaCondicions === true;

    if (!nom || !email || !telefon || !dni || !iban) {
      return NextResponse.json(
        { error: "Falten dades obligatòries per tramitar l'alta" },
        { status: 400 },
      );
    }
    if (!validEmail(email)) {
      return NextResponse.json({ error: "L'adreça de correu no és vàlida" }, { status: 400 });
    }
    if (!validaDni(dni)) {
      return NextResponse.json(
        {
          error:
            "El DNI o NIE no és vàlid. La lletra final és un dígit de control: " +
            "ha de correspondre al número, tal com surt al document.",
        },
        { status: 400 },
      );
    }
    if (!validaIban(iban)) {
      return NextResponse.json(
        { error: "L'IBAN no és vàlid. Copia'l tal com surt a la teva llibreta o app del banc." },
        { status: 400 },
      );
    }
    // Sense mandat no hi ha res que empari el cobrament al compte del soci, i
    // sense condicions acceptades no hi ha base per tractar-ne les dades.
    if (!acceptaMandat || !acceptaCondicions) {
      return NextResponse.json(
        { error: "Cal autoritzar la domiciliació i acceptar les condicions per completar l'alta" },
        { status: 400 },
      );
    }

    // La modalitat i el preu surten de Supabase, mai del formulari: el preu
    // que arriba del navegador no decideix res.
    const supabase = getSupabaseAdmin();
    const { data: tier, error: tierError } = await supabase
      .from("membership_tiers")
      .select("id, name, price_eur, season")
      .eq("slug", tierSlug)
      .eq("status", "active")
      .maybeSingle();
    if (tierError) throw new Error("No s'ha pogut consultar la modalitat");
    if (!tier || !Number.isFinite(Number(tier.price_eur)) || Number(tier.price_eur) <= 0) {
      throw new RequestError("La modalitat seleccionada no està disponible", 409);
    }
    const tierName = tier.name;
    const priceEur = Number(tier.price_eur);
    const season = tier.season;

    const mandateAcceptedAt = new Date().toISOString();
    const { error } = await supabase
      .from("soci_registrations")
      .insert({
        nom,
        dni,
        email,
        telefon,
        iban,
        tier_id: tier.id,
        tier_slug: tierSlug,
        tier_name: tierName,
        price_eur: priceEur,
        season,
        notes: notes || null,
        mandate_accepted_at: mandateAcceptedAt,
        terms_version: TERMS_VERSION,
        status: "pending",
      });

    if (error) {
      // 23505 = unique_violation sobre (dni, temporada): ja hi ha una alta.
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Aquest DNI ja consta donat d'alta per a aquesta temporada." },
          { status: 409 },
        );
      }
      console.error("[Socis] Error desant l'alta:", error.code);
      return NextResponse.json({ error: "No s'ha pogut desar l'alta" }, { status: 500 });
    }

    // The database trigger queues delivery in the same transaction.
    return NextResponse.json({ ok: true, tierName, season, priceEur });
  } catch (err) {
    if (err instanceof RequestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[Socis] Service unavailable");
    return NextResponse.json({ error: "No s'ha pogut completar l'alta. Torna-ho a provar d'aquí a uns minuts." }, { status: 503 });
  }
}
