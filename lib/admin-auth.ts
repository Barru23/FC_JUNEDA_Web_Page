import { NextRequest } from "next/server";

/**
 * Validates the admin session cookie or Authorization header.
 * Uses process.env.ADMIN_PASSWORD (defaults to "admin" in local development).
 */
export function isAdminAuthenticated(req: NextRequest): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin";

  // Check session cookie
  const sessionCookie = req.cookies.get("admin_session");
  if (sessionCookie?.value === expectedPassword) return true;

  // Check Authorization header (for API calls)
  const authHeader = req.headers.get("Authorization");
  if (authHeader === `Bearer ${expectedPassword}`) return true;

  return false;
}
