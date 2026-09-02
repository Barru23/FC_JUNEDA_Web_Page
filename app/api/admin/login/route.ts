import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin";

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
