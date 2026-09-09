import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMembershipTier } from "@/lib/memberships";
import { notifyPurchase } from "@/lib/notify";
import { normalitzaIdentificador, normalitzaDni, validaDni, validaIban, formatIban } from "@/lib/identitat";
import { TERMS_VERSION } from "@/lib/legal";

// POST /api/socis — alta de soci SENSE pagament en linia.
//
// El soci no passa per Stripe: deixa les dades i la Junta fa la domiciliacio a
// ma. Per aixo la fila va a `soci_registrations` i no a `purchases`, que nomes
// recull cobraments ja fets: comptar una alta com a ingres inflaria les
// estadistiques amb diners que encara no han entrat.

function net(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Mateixa validacio laxa que el checkout: descartem nomes el que segur que no
// es una adreca, i qui decideix si existeix es el correu de confirmacio.
function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const nom = net(body.nom, 120);
    const email = net(body.email, 160);
    const telefon = net(body.telefon, 40);
    const dni = normalitzaDni(net(body.dni, 20));
    const iban = normalitzaIdentificador(net(body.iban, 40));
    const notes = net(body.notes, 500);
    const tierSlug = net(body.tierSlug, 80) || "soci-general";
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
    const catalogueTier = getMembershipTier(tierSlug);
    let tierName = catalogueTier?.name ?? "Soci General";
    let priceEur = catalogueTier?.price_eur ?? null;
    let season = catalogueTier?.season ?? "2026/27";
    let tierDbId: string | null = null;

    const { data: tier } = await supabase
      .from("membership_tiers")
      .select("id, name, price_eur, season")
      .eq("slug", tierSlug)
      .maybeSingle();
    if (tier) {
      tierDbId = tier.id;
      tierName = tier.name;
      priceEur = Number(tier.price_eur);
      season = tier.season;
    }

    const mandateAcceptedAt = new Date().toISOString();
    const { data: registration, error } = await supabase
      .from("soci_registrations")
      .insert({
        nom,
        dni,
        email,
        telefon,
        iban,
        tier_id: tierDbId,
        tier_slug: tierSlug,
        tier_name: tierName,
        price_eur: priceEur,
        season,
        notes: notes || null,
        mandate_accepted_at: mandateAcceptedAt,
        terms_version: TERMS_VERSION,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      // 23505 = unique_violation sobre (dni, temporada): ja hi ha una alta.
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Aquest DNI ja consta donat d'alta per a aquesta temporada." },
          { status: 409 },
        );
      }
      console.error("[Socis] Error desant l'alta:", error);
      return NextResponse.json({ error: "No s'ha pogut desar l'alta" }, { status: 500 });
    }

    // El full i el correu no son imprescindibles: l'alta ja es a Supabase i la
    // Junta la veu a /admin encara que aixo falli.
    const result = await notifyPurchase({
      type: "soci",
      // Pestanya propia, no la "Socis" de sempre: aquella te les columnes de
      // les quotes cobrades per Stripe i unes altes amb DNI i IBAN hi caurien
      // desquadrades sota unes capçaleres que no els corresponen.
      sheet: "Altes Socis",
      row: {
        nom,
        email,
        telefon,
        dni,
        iban: formatIban(iban),
        tipusSoci: tierName,
        temporada: season,
        observacions: notes || "—",
        preu: priceEur ?? 0,
        metode: "Domiciliació bancària",
        estat: "Pendent de domiciliar",
        data: new Date().toLocaleString("ca-ES", { timeZone: "Europe/Madrid" }),
      },
      email: {
        to: email,
        buyerName: nom,
        tierName,
        season,
        quotaAnual: priceEur ?? undefined,
      },
    });

    if (result?.ok && registration?.id) {
      await supabase
        .from("soci_registrations")
        .update({ sheet_synced: true })
        .eq("id", registration.id);
    }

    return NextResponse.json({ ok: true, tierName, season, priceEur });
  } catch (err) {
    console.error("[Socis] Error:", err);
    return NextResponse.json({ error: "Error intern del servidor" }, { status: 500 });
  }
}
