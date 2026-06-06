import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "check") {
    return NextResponse.json({
      status: "Socket.io server runs via custom server",
      rooms: ["restaurant:{id}", "table:{id}", "kitchen"],
      events: [
        "order:created",
        "order:updated",
        "order:completed",
        "item:delivered",
        "item:ready",
        "order:ready",
        "payment:requested",
        "payment:confirmed",
      ],
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}