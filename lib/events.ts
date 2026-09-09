import type { SupabaseClient } from "@supabase/supabase-js";
import eventsJson from "@/content/events.json";
import type { DbEvent } from "./supabase";
import type { ClubEvent } from "./data";

// The JSON catalogue is retained only to seed legacy events. Supabase is the
// live source of truth for public details, availability and checkout prices.
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
  totalSpots: number;
  status: "active" | "cancelled";
}

export const eventCatalogue: EventCatalogueEntry[] = eventsJson as EventCatalogueEntry[];

export function getCatalogueEntry(slug: string): EventCatalogueEntry | undefined {
  return eventCatalogue.find((event) => event.slug === slug);
}

/**
 * Inserts a database row for legacy catalogue entries that do not have one.
 * Existing rows are never overwritten, so admin edits and sold spots win.
 */
export async function syncEventCatalogue(supabase: SupabaseClient): Promise<void> {
  const { data: existing, error } = await supabase
    .from("events")
    .select("slug")
    .not("slug", "is", null);
  if (error) throw error;

  const existingSlugs = new Set((existing ?? []).map((row: { slug: string | null }) => row.slug));
  const missing = eventCatalogue.filter((event) => event.status === "active" && !existingSlugs.has(event.slug));
  if (missing.length === 0) return;

  const { error: insertError } = await supabase.from("events").insert(
    missing.map((event) => ({
      slug: event.slug,
      title: event.title,
      description: event.description,
      event_type: event.eventType,
      date: event.date,
      location: event.location,
      menu: event.menu,
      image_url: event.imageUrl ?? null,
      price_eur: event.priceEur,
      total_spots: event.totalSpots,
      spots_remaining: event.totalSpots,
      status: "active",
    }))
  );
  if (insertError) throw insertError;
}

/** Maps a live database event to the shape consumed by the public page. */
export function mapDbEvent(row: DbEvent): ClubEvent {
  const catalogueEntry = row.slug ? getCatalogueEntry(row.slug) : undefined;

  return {
    id: row.slug ?? row.id,
    dbId: row.id,
    title: row.title,
    date: row.date,
    // There is no separate time column yet; legacy events can retain theirs.
    time: catalogueEntry?.time,
    location: row.location,
    menu: row.menu ?? "",
    description: row.description ?? undefined,
    imageUrl: row.image_url,
    price: Number(row.price_eur),
    spotsLeft: row.spots_remaining,
    totalSpots: row.total_spots,
    status: row.status,
  };
}
