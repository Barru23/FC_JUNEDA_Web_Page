import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { readAll } from "@/lib/read-all";
import type { DbSociRegistration } from "@/lib/supabase";

const ESTATS = new Set(["pending", "active", "cancelled"]);

// GET /api/admin/socis — altes de soci pendents de domiciliar i ja domiciliades.
//
// Retorna DNI i IBAN sencers: son justament les dades que la Junta necessita
// per muntar la remesa al banc. Per aixo la ruta esta darrere
// isAdminAuthenticated i no s'exposa mai al web public.
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const status = req.nextUrl.searchParams.get("status");

    let query = supabase
      .from("soci_registrations")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && ESTATS.has(status)) query = query.eq("status", status);

    const data = await readAll<DbSociRegistration>((from,to) => query.order("id").range(from,to));
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.warn("[Admin Socis] Catch fallback:", err);
    return NextResponse.json({error:"No s'han pogut carregar les dades"},{status:503});
  }
}

// PATCH /api/admin/socis — marcar una alta com a domiciliada o anul·lada.
export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) {
    return NextResponse.json({ error: "No autoritzat" }, { status: 401 });
  }

  const body = await req.json();
  const { id, status } = body;

  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "ID requerit" }, { status: 400 });
  }
  if (typeof status !== "string" || !ESTATS.has(status)) {
    return NextResponse.json({ error: "Estat no vàlid" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("soci_registrations")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
