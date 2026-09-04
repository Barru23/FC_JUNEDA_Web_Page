import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";

// GET /api/admin/products — list all products
export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });

    if (error) {
      console.warn("[Admin Products] Query fallback:", error.message);
      return NextResponse.json([]);
    }
    return NextResponse.json(data ?? []);
  } catch (err) {
    console.warn("[Admin Products] Catch fallback:", err);
    return NextResponse.json([]);
  }
}

// PATCH /api/admin/products — update a product (price, stock, status, name, description)
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthenticated(req)) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID requerit" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[Admin Products] Update error:", err);
    return NextResponse.json({ error: "Error de connexió amb la base de dades" }, { status: 500 });
  }
}
