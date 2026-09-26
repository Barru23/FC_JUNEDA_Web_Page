import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const expected = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(req.url).origin;
  return origin === new URL(expected).origin;
}

export function privateHash(value: string): string {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Falta el secret de protecció de peticions");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function equalSecret(a: string, b: string): boolean {
  const one = Buffer.from(privateHash(a));
  const two = Buffer.from(privateHash(b));
  return timingSafeEqual(one, two);
}

export function clientAddress(req: NextRequest): string {
  // Netlify injects the connection address. Never trust caller-controlled XFF.
  const address = process.env.SITE_ID ? req.headers.get("x-nf-client-connection-ip") : null;
  if (address && isIP(address)) return address;
  // Missing platform metadata shares a conservative bucket; it cannot bypass
  // the limit by rotating a user-supplied header.
  return process.env.NODE_ENV === "production" ? "unknown" : "local";
}

export async function limitRequest(req: NextRequest, scope: string, limit: number, seconds: number) {
  const { data, error } = await getSupabaseAdmin().rpc("consume_request_limit", {
    p_key: privateHash(`${scope}:${clientAddress(req)}`), p_limit: limit, p_seconds: seconds,
  });
  if (error || !data?.[0]) {
    console.error("[Request limit] Protection unavailable", error?.code);
    return NextResponse.json({ error: "El servei no està disponible ara mateix. Torna-ho a provar d'aquí a uns minuts." }, { status: 503 });
  }
  if (!data[0].allowed) return NextResponse.json({ error: "Has fet massa intents. Espera uns minuts abans de tornar-ho a provar." }, {
    status: 429, headers: { "Retry-After": String(data[0].retry_after) },
  });
  return null;
}

export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function readJson(req: NextRequest, maxBytes = 8192): Promise<Record<string, unknown>> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new RequestError("Format de petició no vàlid", 415);
  if (Number(req.headers.get("content-length")) > maxBytes) throw new RequestError("La petició és massa gran", 413);
  const reader = req.body?.getReader();
  if (!reader) throw new RequestError("Petició buida");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > maxBytes) { await reader.cancel(); throw new RequestError("La petició és massa gran", 413); }
    chunks.push(part.value);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new RequestError("Petició no vàlida"); }
}
