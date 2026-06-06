import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { canManageWaiters } from "@lib/admin/rbac";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageWaiters(authUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const waiterId = url.searchParams.get("waiterId");
    const includeAll = url.searchParams.get("all") === "true";

    const whereClause: {
      isActive: boolean;
      destroyedAt: null;
      waiterId?: string;
    } = { isActive: true, destroyedAt: null };
    if (waiterId) whereClause.waiterId = waiterId;

    const sessions = await prisma.waiterSession.findMany({
      where: includeAll ? {} : whereClause,
      select: {
        id: true,
        waiterId: true,
        deviceId: true,
        pin: true,
        deviceName: true,
        deviceOS: true,
        ipAddress: true,
        isActive: true,
        lastSyncAt: true,
        createdAt: true,
        destroyedAt: true,
        waiter: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
      orderBy: { lastSyncAt: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}
