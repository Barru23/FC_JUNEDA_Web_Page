import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createEventSheetTab } from "@/lib/sheets";

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
  const { title, description, event_type, date, location, menu, price_eur, total_spots, booking_fee_eur } = body;

  if (!title || !date || !location || !price_eur || !total_spots) {
    return NextResponse.json({ error: "Falten camps obligatoris" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Auto-create Google Sheet tab for this event
  let sheetId: string | null = null;
  try {
    sheetId = await createEventSheetTab(title);
  } catch (sheetErr) {
    console.warn("[Events] Sheet creation failed (non-fatal):", sheetErr);
  }

  const { data, error } = await supabase
    .from("events")
    .insert({
      title, description, event_type: event_type ?? "dinner",
      date, location, menu, price_eur, total_spots,
      spots_remaining: total_spots,
      booking_fee_eur: booking_fee_eur ?? 0.75,
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
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID requerit" }, { status: 400 });

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
