import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { orderId: id },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: { orderId: id } }),
    ]);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      userId: log.userId,
      userName: log.user?.name,
      userRole: log.user?.role,
      details: log.details ? JSON.parse(log.details) : {},
      timestamp: log.timestamp.toISOString(),
    }));

    return NextResponse.json({
      orderId: id,
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Order audit history error:", error);
    return NextResponse.json({ error: "Failed to fetch audit history" }, { status: 500 });
  }
}
