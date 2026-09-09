import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";

const EVENT_TYPES = new Set(["dinner", "lunch", "party", "other"]);
const EVENT_STATUSES = new Set(["active", "sold_out", "cancelled", "past"]);

function positiveMoney(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

function nonNegativeMoney(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null;
}

// GET /api/admin/events — list all events with purchase counts
export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("events")
      .select("*, purchases(count)")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[Admin Events] Query fallback:", error.message);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.warn("[Admin Events] Catch fallback:", err);
    return NextResponse.json([]);
  }
}

// POST /api/admin/events — create a new event + auto-create Google Sheet tab
export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const body = await req.json();
  const { title, description, event_type, date, location, menu, image_url } = body;
  const priceEur = positiveMoney(body.price_eur);
  const bookingFeeEur = nonNegativeMoney(body.booking_fee_eur ?? 0.75);
  const totalSpots = Number(body.total_spots);

  if (
    typeof title !== "string" || !title.trim() ||
    typeof date !== "string" || !date.trim() ||
    typeof location !== "string" || !location.trim()
  ) {
    return NextResponse.json({ error: "Falten camps obligatoris" }, { status: 400 });
  }
  if (priceEur === null || bookingFeeEur === null || !Number.isInteger(totalSpots) || totalSpots < 1) {
    return NextResponse.json({ error: "Preu, taxa o places no vàlids" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // La pestanya del full no es crea aqui: l'Apps Script la crea, amb les
  // capcaleres, la primera vegada que hi arriba una inscripcio. Nomes desem
  // com s'ha de dir, perque reanomenar l'esdeveniment mes endavant no acabi
  // escrivint en una pestanya nova i deixant enrere les files ja registrades.
  // Mateixa neteja que netejarNomFull_() a apps-script/Codi.gs, en el mateix
  // ordre: Google Sheets no admet [ ] * ? / \ : en un nom de pestanya.
  const sheetId: string = title.replace(/[[\]*?/\\:]/g, "").trim().slice(0, 100);

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      event_type: EVENT_TYPES.has(event_type) ? event_type : "dinner",
      date: date.trim(),
      location: location.trim(),
      menu: typeof menu === "string" ? menu.trim() || null : null,
      image_url: typeof image_url === "string" ? image_url.trim() || null : null,
      price_eur: priceEur,
      total_spots: totalSpots,
      spots_remaining: totalSpots,
      booking_fee_eur: bookingFeeEur,
      sheet_id: sheetId,
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/admin/events — update event
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "ID requerit" }, { status: 400 });

  const priceEur = positiveMoney(body.price_eur);
  const bookingFeeEur = nonNegativeMoney(body.booking_fee_eur);
  const totalSpots = Number(body.total_spots);
  const spotsRemaining = Number(body.spots_remaining);
  if (
    priceEur === null ||
    bookingFeeEur === null ||
    !Number.isInteger(totalSpots) ||
    totalSpots < 1 ||
    !Number.isInteger(spotsRemaining) ||
    spotsRemaining < 0 ||
    spotsRemaining > totalSpots
  ) {
    return NextResponse.json({ error: "Preu, taxa o places no vàlids" }, { status: 400 });
  }

  const updates = {
    title: typeof body.title === "string" ? body.title.trim() : "",
    description: typeof body.description === "string" ? body.description.trim() || null : null,
    event_type: EVENT_TYPES.has(body.event_type) ? body.event_type : "other",
    date: typeof body.date === "string" ? body.date.trim() : "",
    location: typeof body.location === "string" ? body.location.trim() : "",
    menu: typeof body.menu === "string" ? body.menu.trim() || null : null,
    image_url: typeof body.image_url === "string" ? body.image_url.trim() || null : null,
    price_eur: priceEur,
    total_spots: totalSpots,
    spots_remaining: spotsRemaining,
    booking_fee_eur: bookingFeeEur,
    status: EVENT_STATUSES.has(body.status) ? body.status : "active",
  };
  if (!updates.title || !updates.date || !updates.location) {
    return NextResponse.json({ error: "Falten camps obligatoris" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("events").update(updates).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/events — soft-delete (set status = cancelled)
export async function DELETE(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerit" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("events").update({ status: "cancelled" }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
