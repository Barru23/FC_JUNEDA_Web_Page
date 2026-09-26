import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { equalSecret, privateHash, sameOrigin } from "@/lib/request-security";

export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
export function getAdminPassword(): string | null {
  return process.env.ADMIN_PASSWORD?.trim() || (process.env.NODE_ENV === "production" ? null : "admin");
}
export function validAdminPassword(value: unknown): boolean {
  const expected = getAdminPassword();
  return typeof value === "string" && !!expected && equalSecret(value, expected);
}
function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function credentialVersion() { return privateHash(`admin:${getAdminPassword()}`); }

export async function createAdminSession(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const { error } = await getSupabaseAdmin().from("admin_sessions").insert({
    token_hash: tokenHash(token), credential_version: credentialVersion(),
    expires_at: new Date(Date.now() + ADMIN_SESSION_SECONDS * 1000).toISOString(),
  });
  if (error) throw new Error("No s'ha pogut crear la sessió");
  return token;
}

export async function isAdminAuthenticated(req: NextRequest): Promise<boolean> {
  if (!getAdminPassword()) return false;
  if (!["GET", "HEAD"].includes(req.method) && !sameOrigin(req)) return false;
  const token = req.cookies.get("admin_session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const { data, error } = await getSupabaseAdmin().from("admin_sessions")
    .select("token_hash").eq("token_hash", tokenHash(token))
    .eq("credential_version", credentialVersion()).gt("expires_at", new Date().toISOString()).maybeSingle();
  return !error && !!data;
}

export async function revokeAdminSession(req: NextRequest): Promise<void> {
  const token = req.cookies.get("admin_session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  const { error } = await getSupabaseAdmin().from("admin_sessions").delete().eq("token_hash", tokenHash(token));
  if (error) throw new Error("No s'ha pogut tancar la sessió");
}
