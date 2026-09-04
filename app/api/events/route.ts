import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { DbEvent } from "@/lib/supabase";
import { eventCatalogue, syncEventCatalogue, mergeEvent } from "@/lib/events";

// GET /api/events — public list of active events, merged from the
// content/events.json catalogue (title/date/price/...) and Supabase's live
// spots_remaining/status per slug. Falls back to the catalogue alone (full
// spots) if Supabase is unreachable, so the page never renders empty.
export async function GET() {
  const activeEntries = eventCatalogue.filter((e) => e.status === "active");

  try {
    const supabase = getSupabaseAdmin();
    await syncEventCatalogue(supabase);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .not("slug", "is", null)
      .in("status", ["active", "sold_out"]);
    if (error) throw error;

    const rows = (data ?? []) as DbEvent[];
    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    const merged = activeEntries
      .filter((entry) => {
        const row = bySlug.get(entry.slug);
        return !row || row.status !== "cancelled";
      })
      .map((entry) => mergeEvent(entry, bySlug.get(entry.slug)));

    return NextResponse.json(merged);
  } catch (err) {
    console.warn("[Events] Supabase unavailable, serving catalogue fallback:", err);
    return NextResponse.json(activeEntries.map((entry) => mergeEvent(entry)));
  }
}
