import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// Sold-out products remain visible; only hidden products leave the catalogue.
export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("status", ["active", "out_of_stock"])
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? [], {
    headers: { "Cache-Control": "no-store" },
  });
}
