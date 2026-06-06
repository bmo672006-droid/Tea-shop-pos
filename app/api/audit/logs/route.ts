import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const userId = searchParams.get("userId");
    const actionType = searchParams.get("actionType");
    const orderId = searchParams.get("orderId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (dateFrom || dateTo) {
      whereClause.timestamp = {};
      if (dateFrom) {
        (whereClause.timestamp as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (whereClause.timestamp as Record<string, unknown>).lte = new Date(dateTo);
      }
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (actionType) {
      whereClause.action = actionType;
    }

    if (orderId) {
      whereClause.orderId = orderId;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, role: true } },
          order: { select: { id: true, status: true, totalAmount: true } },
        },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user?.name,
      userRole: log.user?.role,
      action: log.action,
      orderId: log.orderId,
      orderStatus: log.order?.status,
      orderTotal: log.order?.totalAmount,
      details: log.details ? JSON.parse(log.details) : {},
      timestamp: log.timestamp.toISOString(),
    }));

    return NextResponse.json({
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Audit logs error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}