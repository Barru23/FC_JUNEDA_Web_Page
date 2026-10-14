import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getMembershipTier } from "@/lib/memberships";
import { PUBLIC_CATALOGUE_HEADERS } from "@/lib/request-security";

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin().from("membership_tiers").select("*").eq("status", "active");
    if (error) throw error;
    return NextResponse.json((data ?? []).map(row => {
      const description = getMembershipTier(row.slug);
      return { ...description, id: row.id, slug: row.slug, name: row.name,
        price_eur: Number(row.price_eur), season: row.season, status: row.status,
        badge: description?.badge ?? row.name, icon: description?.icon ?? "Users",
        target: description?.target ?? "", description: description?.description ?? "",
        benefits: description?.benefits ?? (row.benefits ? [row.benefits] : []),
      };
    }), { headers: PUBLIC_CATALOGUE_HEADERS });
  } catch {
    return NextResponse.json({ error: "No s'han pogut carregar les modalitats. Torna-ho a provar." }, { status: 503 });
  }
}
