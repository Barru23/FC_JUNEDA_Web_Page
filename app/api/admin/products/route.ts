import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { isAdminAuthenticated } from "@/lib/admin-auth";

const PRODUCT_STATUSES = new Set(["active", "out_of_stock", "hidden"]);

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "producte";
}

function stringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 30);
}

function normalizedStock(value: unknown, sizes: string[]): Record<string, number> {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  return Object.fromEntries(
    sizes.map((size) => {
      const amount = Number(source[size] ?? 0);
      return [size, Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0];
    })
  );
}

function productPayload(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = Number(body.price_eur);
  const sizes = stringArray(body.sizes, ["Única"]);
  const status = typeof body.status === "string" && PRODUCT_STATUSES.has(body.status)
    ? body.status
    : "active";

  if (!name) throw new Error("El nom és obligatori");
  if (!Number.isFinite(price) || price <= 0) throw new Error("El preu ha de ser superior a 0");
  if (sizes.length === 0) throw new Error("Cal indicar almenys una talla o variant");

  return {
    name,
    description: typeof body.description === "string" ? body.description.trim() || null : null,
    price_eur: Math.round(price * 100) / 100,
    sizes,
    swatches: stringArray(body.swatches),
    customizable: body.customizable === true,
    image_url: typeof body.image_url === "string" ? body.image_url.trim() || null : null,
    stock: normalizedStock(body.stock, sizes),
    status,
  };
}

// GET /api/admin/products — list all products, including hidden ones.
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[Admin Products] List error:", err);
    return NextResponse.json({ error: "No s'han pogut carregar els productes" }, { status: 500 });
  }
}

// POST /api/admin/products — create a product and publish it to the storefront.
export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const payload = productPayload(body);
    const requestedSlug = typeof body.slug === "string" ? slugify(body.slug) : slugify(payload.name);
    const supabase = getSupabaseAdmin();

    const { data: matches, error: lookupError } = await supabase
      .from("products")
      .select("slug")
      .like("slug", `${requestedSlug}%`);
    if (lookupError) throw lookupError;

    const existing = new Set((matches ?? []).map((item: { slug: string }) => item.slug));
    let slug = requestedSlug;
    let suffix = 2;
    while (existing.has(slug)) slug = `${requestedSlug}-${suffix++}`;

    const { data, error } = await supabase
      .from("products")
      .insert({ ...payload, slug })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No s'ha pogut crear el producte";
    const status = message.startsWith("El ") || message.startsWith("Cal ") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// PATCH /api/admin/products — edit only storefront-safe product fields.
export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "ID requerit" }, { status: 400 });

    const payload = productPayload(body);
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "No s'ha pogut editar el producte";
    const status = message.startsWith("El ") || message.startsWith("Cal ") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE is intentionally recoverable: the product is hidden, not erased.
export async function DELETE(req: NextRequest) {
  if (!(await isAdminAuthenticated(req))) return NextResponse.json({ error: "No autoritzat" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requerit" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("products").update({ status: "hidden" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
