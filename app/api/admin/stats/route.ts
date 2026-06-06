import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { canManageAdmins, getRoleDescription } from "@lib/admin/rbac";
import type { UserRole } from "@lib/auth/types";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageAdmins(authUser.role)) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to access admin management" },
        { status: 403 }
      );
    }

    // Get admin statistics
    const adminStats = await prisma.user.groupBy({
      by: ["role"],
      where: {
        role: { in: ["SUPER_ADMIN", "MANAGER", "COUNTER"] },
      },
      _count: true,
    });

    const waiterStats = await prisma.user.findMany({
      where: { role: "WAITER" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    const stats = {
      admins: adminStats.map((stat) => ({
        role: stat.role,
        count: stat._count,
        description: getRoleDescription(stat.role as UserRole),
      })),
      waiters: {
        total: waiterStats.length,
        active: waiterStats.filter((w) => w.isActive).length,
        inactive: waiterStats.filter((w) => !w.isActive).length,
      },
      recentAuditLogs: await prisma.adminAuditLog.findMany({
        take: 10,
        orderBy: { timestamp: "desc" },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching admin management stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin management stats" },
      { status: 500 }
    );
  }
}
