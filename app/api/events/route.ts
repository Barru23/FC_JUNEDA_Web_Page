import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { DbEvent } from "@/lib/supabase";
import { syncEventCatalogue, mapDbEvent } from "@/lib/events";

// GET /api/events — public list of every sellable event in Supabase. The JSON
// catalogue only seeds legacy events; events created from /admin are immediately
// visible without editing a source file. We fail closed if Supabase is down so
// the site never advertises a stale price that checkout cannot honor.
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    await syncEventCatalogue(supabase);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .in("status", ["active", "sold_out", "closed"])
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as DbEvent[];
    return NextResponse.json(rows.map(mapDbEvent), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[Events] Supabase unavailable:", err);
    return NextResponse.json({ error: "No s'han pogut carregar els esdeveniments" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
