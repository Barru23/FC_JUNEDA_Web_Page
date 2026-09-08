import { NextRequest, NextResponse } from "next/server";
import { getAdminPassword } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;
    const expectedPassword = getAdminPassword();
    if (!expectedPassword) {
      console.error("[Login] ADMIN_PASSWORD no està definida — accés bloquejat");
      return NextResponse.json({ error: "El panell no està configurat" }, { status: 503 });
    }

    if (password === expectedPassword) {
      const response = NextResponse.json({ success: true });
      // Set session cookie
      response.cookies.set("admin_session", password, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }

    return NextResponse.json({ error: "Contrasenya incorrecta" }, { status: 401 });
  } catch (err) {
    console.error("[Login] Error:", err);
    return NextResponse.json({ error: "Error intern" }, { status: 500 });
  }
}
