import { NextRequest, NextResponse } from "next/server";
import { auth } from "@lib/auth/better-auth";
import prisma from "@lib/prisma";
import type { AuthUser } from "@lib/auth/types";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findFirst({
      where: {
        email: session.user.email.toLowerCase(),
        role: { in: ["SUPER_ADMIN", "MANAGER", "COUNTER"] },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        restaurantId: true,
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user: AuthUser = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role as AuthUser["role"],
      isActive: admin.isActive,
    };

    return NextResponse.json({ user, restaurantId: admin.restaurantId });
  } catch (error) {
    console.error("Session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
