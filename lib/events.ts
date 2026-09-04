// lib/events.ts
//
// The events catalogue (title/date/time/price/description/menu/...) lives
// in content/events.json so the club can add or edit an event without
// touching any component. Supabase only tracks what genuinely needs to be
// live — spots_remaining and status — keyed by the catalogue's `slug`
// (see the events.slug column added in supabase-schema.sql). syncEventCatalogue
// makes sure every active catalogue entry has a matching DB row to sell
// tickets against; mergeEvent combines the two into the public ClubEvent shape.

import type { SupabaseClient } from "@supabase/supabase-js";
import eventsJson from "@/content/events.json";
import type { DbEvent } from "./supabase";
import type { ClubEvent } from "./data";

export interface EventCatalogueEntry {
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  menu: string;
  description: string;
  imageUrl?: string;
  eventType: "dinner" | "lunch" | "party" | "other";
  priceEur: number;
  bookingFeeEur: number;
  totalSpots: number;
  status: "active" | "cancelled";
}

export const eventCatalogue: EventCatalogueEntry[] = eventsJson as EventCatalogueEntry[];

export function getCatalogueEntry(slug: string): EventCatalogueEntry | undefined {
  return eventCatalogue.find((e) => e.slug === slug);
}

/**
 * Inserts a Supabase row for any active catalogue entry that doesn't have
 * one yet (matched by slug). Never touches an existing row, so live
 * spots_remaining from past sales is untouched.
 */
export async function syncEventCatalogue(supabase: SupabaseClient): Promise<void> {
  const { data: existing, error } = await supabase.from("events").select("slug").not("slug", "is", null);
  if (error) throw error;

  const existingSlugs = new Set((existing ?? []).map((r: { slug: string | null }) => r.slug));
  const missing = eventCatalogue.filter((e) => e.status === "active" && !existingSlugs.has(e.slug));
  if (missing.length === 0) return;

  const { error: insertErr } = await supabase.from("events").insert(
    missing.map((e) => ({
      slug: e.slug,
      title: e.title,
      description: e.description,
      event_type: e.eventType,
      date: e.date,
      location: e.location,
      menu: e.menu,
      image_url: e.imageUrl ?? null,
      price_eur: e.priceEur,
      total_spots: e.totalSpots,
      spots_remaining: e.totalSpots,
      booking_fee_eur: e.bookingFeeEur,
      status: "active",
    }))
  );
  if (insertErr) throw insertErr;
}

/**
 * Combines a catalogue entry with its live Supabase row (if any) into the
 * public ClubEvent shape. The DB row wins on every field it owns — the JSON
 * catalogue only seeds a NEW event (see syncEventCatalogue); once the row
 * exists, editing it from the admin panel is what the public site reflects.
 * `time` is the one exception: there's no events.time column, so it always
 * comes from the catalogue.
 */
export function mergeEvent(entry: EventCatalogueEntry, dbRow?: DbEvent): ClubEvent {
  return {
    id: entry.slug,
    dbId: dbRow?.id,
    title: dbRow?.title ?? entry.title,
    date: dbRow?.date ?? entry.date,
    time: entry.time,
    location: dbRow?.location ?? entry.location,
    menu: dbRow?.menu ?? entry.menu,
    description: dbRow?.description ?? entry.description,
    imageUrl: dbRow?.image_url ?? entry.imageUrl ?? null,
    price: dbRow?.price_eur ?? entry.priceEur,
    spotsLeft: dbRow?.spots_remaining ?? entry.totalSpots,
    totalSpots: dbRow?.total_spots ?? entry.totalSpots,
    status: dbRow?.status ?? entry.status,
    bookingFee: dbRow?.booking_fee_eur ?? entry.bookingFeeEur,
  };
}
