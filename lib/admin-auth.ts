import { NextRequest } from "next/server";

/**
 * La contrasenya d'administració, o null si no està configurada.
 * En desenvolupament local acceptem "admin" per comoditat; en producció, si
 * ADMIN_PASSWORD no està definida, el panell queda tancat en lloc de quedar
 * obert amb una contrasenya per defecte que tothom coneix.
 */
export function getAdminPassword(): string | null {
  const configured = process.env.ADMIN_PASSWORD?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? null : "admin";
}

/**
 * Validates the admin session cookie or Authorization header.
 * Uses getAdminPassword(): tancat en producció si ADMIN_PASSWORD no hi és.
 */
export function isAdminAuthenticated(req: NextRequest): boolean {
  const expectedPassword = getAdminPassword();
  if (!expectedPassword) return false;

  // Check session cookie
  const sessionCookie = req.cookies.get("admin_session");
  if (sessionCookie?.value === expectedPassword) return true;

  // Check Authorization header (for API calls)
  const authHeader = req.headers.get("Authorization");
  if (authHeader === `Bearer ${expectedPassword}`) return true;

  return false;
}
