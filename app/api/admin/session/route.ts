import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated, revokeAdminSession } from "@/lib/admin-auth";
import { sameOrigin } from "@/lib/request-security";

export async function GET(req: NextRequest) {
  const authenticated = await isAdminAuthenticated(req);
  return NextResponse.json({ authenticated }, { status: authenticated ? 200 : 401, headers: { "Cache-Control": "no-store" } });
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origen no autoritzat" }, { status: 403 });
  try {
    await revokeAdminSession(req);
    const response = NextResponse.json({ ok: true });
    response.cookies.set("admin_session", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ error: "No s'ha pogut tancar la sessió. Torna-ho a provar." }, { status: 503 });
  }
}
