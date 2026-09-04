import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAllActiveMembershipTiers } from "@/lib/memberships";

export async function GET() {
  const catalogue = getAllActiveMembershipTiers();

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("membership_tiers")
      .select("*")
      .eq("status", "active");

    if (!error && data && data.length > 0) {
      // Merge DB id / live status with catalogue details
      const merged = catalogue.map((cat) => {
        const dbRow = data.find((r) => r.slug === cat.slug);
        return {
          ...cat,
          id: dbRow?.id ?? cat.slug,
          price_eur: dbRow?.price_eur ?? cat.price_eur,
        };
      });
      return NextResponse.json(merged);
    }
  } catch (err) {
    console.warn("[MembershipTiers] Fallback to static catalogue:", err);
  }

  return NextResponse.json(catalogue);
}

