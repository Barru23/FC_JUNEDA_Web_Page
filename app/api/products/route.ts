import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PUBLIC_CATALOGUE_HEADERS } from "@/lib/request-security";

// Sold-out products remain visible; only hidden products leave the catalogue.
export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("status", ["active", "out_of_stock"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Products] Supabase unavailable:", error.code);
    return NextResponse.json({ error: "No s'han pogut carregar els productes" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
  return NextResponse.json(data ?? [], { headers: PUBLIC_CATALOGUE_HEADERS });
}
