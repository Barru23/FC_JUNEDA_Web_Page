import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";

const EVENT_TYPES = new Set(["dinner", "lunch", "party", "other"]);
import { EVENT_STATUSES } from "@/lib/event-status";
import { readAll } from "@/lib/read-all";

function positiveMoney(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) / 100 : null;
}

// GET /api/admin/events — list all events with purchase counts
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const [events, purchases, reservations] = await Promise.all([
      readAll<any>((from,to) => supabase.from("events").select("*").order("id").range(from,to)),
      readAll<{event_id:string;quantity:number}>((from,to) => supabase.from("purchases").select("event_id,quantity").eq("purchase_type","event").eq("payment_status","completed").order("id").range(from,to)),
      readAll<{event_id:string;quantity:number}>((from,to) => supabase.from("checkout_reservations").select("event_id,quantity").eq("status","reserved").order("stripe_session_id").range(from,to)),
    ]);
    return NextResponse.json(events.map(event => ({...event,
      tickets_sold: purchases.filter(p=>p.event_id===event.id).reduce((n,p)=>n+p.quantity,0),
      reserved_places: reservations.filter(r=>r.event_id===event.id).reduce((n,r)=>n+r.quantity,0),
    })), {headers:{"Cache-Control":"no-store"}});
  } catch (err) {
    console.warn("[Admin Events] Catch fallback:", err);
    return NextResponse.json({ error: "No s'han pogut carregar els esdeveniments" }, { status: 503 });
  }
}

// POST /api/admin/events — create a new event + auto-create Google Sheet tab
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const body = await req.json();
  const { title, description, event_type, date, location, menu, image_url } = body;
  const priceEur = positiveMoney(body.price_eur);
  const totalSpots = Number(body.total_spots);

  if (
    typeof title !== "string" || !title.trim() ||
    typeof date !== "string" || !date.trim() ||
    typeof location !== "string" || !location.trim()
  ) {
    return NextResponse.json({ error: "Falten camps obligatoris" }, { status: 400 });
  }
  if (priceEur === null || !Number.isInteger(totalSpots) || totalSpots < 1) {
    return NextResponse.json({ error: "Preu o places no vàlids" }, { status: 400 });
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
      sheet_id: sheetId,
      status: "closed",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/admin/events — update event
export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "ID requerit" }, { status: 400 });

  const priceEur = positiveMoney(body.price_eur);
  const totalSpots = Number(body.total_spots);
  if (
    priceEur === null ||
    !Number.isInteger(totalSpots) ||
    totalSpots < 1 || !EVENT_STATUSES.has(body.status)
  ) {
    return NextResponse.json({ error: "Preu o places no vàlids" }, { status: 400 });
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
    status: body.status,
  };
  if (!updates.title || !updates.date || !updates.location) {
    return NextResponse.json({ error: "Falten camps obligatoris" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("update_event_details", { p_id: id, p_details: updates });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/admin/events — soft-delete (set status = cancelled)
export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerit" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("events").update({ status: "cancelled" }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
