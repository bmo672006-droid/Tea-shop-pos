import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set("pos-session", "", {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    maxAge: 0,
  });

  response.cookies.set("better-auth.session_token", "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 0,
  });

  return response;
}
