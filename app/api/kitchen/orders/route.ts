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
    const tableId = searchParams.get("tableId");
    const date = searchParams.get("date");

    const pendingOrders = await prisma.order.findMany({
      where: {
        status: { in: ["PENDING", "COOKING"] },
        ...(tableId && { tableId }),
        ...(date && {
          createdAt: {
            gte: new Date(date),
            lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
          },
        }),
      },
      include: {
        items: {
          include: { menuItem: true },
          orderBy: { createdAt: "asc" },
        },
        waiter: { select: { name: true } },
        table: { select: { number: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const completedOrders = await prisma.order.findMany({
      where: {
        status: { in: ["READY", "COMPLETED"] },
        ...(tableId && { tableId }),
        ...(date && {
          createdAt: {
            gte: new Date(date),
            lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
          },
        }),
      },
      include: {
        items: {
          include: { menuItem: true },
          orderBy: { createdAt: "asc" },
        },
        waiter: { select: { name: true } },
        table: { select: { number: true } },
      },
      orderBy: { completedAt: "desc" },
    });

    const now = Date.now();

    type KitchenOrder = (typeof pendingOrders)[number];
    type KitchenOrderItem = KitchenOrder["items"][number];

    const formatOrder = (order: KitchenOrder) => {
      const elapsed = (now - new Date(order.createdAt).getTime()) / (1000 * 60);
      const hasDelayedItems = order.items.some((item: KitchenOrderItem) => {
        const prepTime = item.menuItem.preparationTime;
        const itemElapsed = (now - new Date(item.createdAt).getTime()) / (1000 * 60);
        return item.status === "PENDING" && itemElapsed > prepTime;
      });

      return {
        id: order.id,
        tableNumber: order.table?.number,
        waiterName: order.waiter?.name,
        type: order.type,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        completedAt: order.completedAt?.toISOString(),
        elapsedMinutes: Math.round(elapsed),
        hasDelayedItems,
        items: order.items.map((item: KitchenOrderItem) => {
          const itemElapsed = (now - new Date(item.createdAt).getTime()) / (1000 * 60);
          return {
            id: item.id,
            name: item.menuItem.name,
            quantity: item.quantity,
            status: item.status,
            prepTimeMinutes: item.menuItem.preparationTime,
            elapsedMinutes: Math.round(itemElapsed),
            isDelayed: item.status === "PENDING" && itemElapsed > item.menuItem.preparationTime,
            notes: item.notes,
          };
        }),
      };
    };

    return NextResponse.json({
      pending: pendingOrders.map(formatOrder),
      completed: completedOrders.map(formatOrder),
      counts: {
        pending: pendingOrders.length,
        completed: completedOrders.length,
      },
    });
  } catch (error) {
    console.error("Kitchen orders error:", error);
    return NextResponse.json({ error: "Failed to fetch kitchen orders" }, { status: 500 });
  }
}
