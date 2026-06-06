import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "Socket.io is running" });
}