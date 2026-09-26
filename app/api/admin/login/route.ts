import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_SECONDS, createAdminSession, getAdminPassword, validAdminPassword } from "@/lib/admin-auth";
import { limitRequest, readJson, RequestError, sameOrigin } from "@/lib/request-security";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origen no autoritzat" }, { status: 403 });
  try {
    const limited = await limitRequest(req, "admin-login", 10, 15 * 60);
    if (limited) return limited;
    const body = await readJson(req, 1024);
    if (!getAdminPassword()) return NextResponse.json({ error: "El panell no està configurat" }, { status: 503 });
    if (!validAdminPassword(body.password)) return NextResponse.json({ error: "Contrasenya incorrecta" }, { status: 401 });
    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_session", await createAdminSession(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict",
      path: "/", maxAge: ADMIN_SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : "No s'ha pogut iniciar sessió. Torna-ho a provar." },
      { status: error instanceof RequestError ? error.status : 503 });
  }
}
