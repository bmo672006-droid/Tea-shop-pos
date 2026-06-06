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
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const [
      orders,
      payments,
      items,
      tables,
      auditLogs,
    ] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        include: {
          waiter: { select: { id: true, name: true } },
          table: { select: { id: true, number: true } },
          items: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
          status: "CONFIRMED",
        },
      }),
      prisma.orderItem.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        include: { menuItem: true },
      }),
      prisma.table.findMany({
        select: {
          id: true,
          number: true,
          capacity: true,
          status: true,
          currentOrderId: true,
        },
      }),
      prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: startDate,
            lt: endDate,
          },
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    const salesByMethod: Record<string, number> = {};
    let totalSales = 0;
    const totalOrders = orders.length;
    let completedOrders = 0;

    payments.forEach((payment) => {
      salesByMethod[payment.method] = (salesByMethod[payment.method] || 0) + payment.amount;
      totalSales += payment.amount;
      completedOrders++;
    });

    const waiterPerformance = orders.reduce((acc, order) => {
      const waiterId = order.waiterId;
      if (!acc[waiterId]) {
        acc[waiterId] = {
          waiterId,
          waiterName: order.waiter?.name || "Unknown",
          ordersTaken: 0,
          itemsDelivered: 0,
          totalSales: 0,
        };
      }
      acc[waiterId].ordersTaken++;
      acc[waiterId].totalSales += order.totalAmount;
      return acc;
    }, {} as Record<string, { waiterId: string; waiterName: string; ordersTaken: number; itemsDelivered: number; totalSales: number }>);

    auditLogs.forEach((log) => {
      if (log.action === "DELIVER_ITEM" && log.userId && waiterPerformance[log.userId]) {
        waiterPerformance[log.userId].itemsDelivered++;
      }
    });

    const kitchenStats = items.reduce((acc, item) => {
      const prepTime = item.menuItem?.preparationTime || 15;
      const createdAt = new Date(item.createdAt).getTime();
      const elapsed = item.deliveredAt ? (new Date(item.deliveredAt).getTime() - createdAt) / (1000 * 60) : 0;
      
      acc.totalItems++;
      acc.totalPrepTime += prepTime;
      acc.totalActualTime += elapsed;
      
      if (elapsed > prepTime) {
        acc.delayedItems++;
      }
      
      if (item.status === "DELIVERED") {
        acc.deliveredItems++;
      }
      
      return acc;
    }, { totalItems: 0, totalPrepTime: 0, totalActualTime: 0, delayedItems: 0, deliveredItems: 0 });

    const avgPrepTime = kitchenStats.totalItems > 0 ? kitchenStats.totalPrepTime / kitchenStats.totalItems : 0;
    const avgActualTime = kitchenStats.totalItems > 0 ? kitchenStats.totalActualTime / kitchenStats.totalItems : 0;
    const delayRate = kitchenStats.totalItems > 0 ? (kitchenStats.delayedItems / kitchenStats.totalItems) * 100 : 0;

    const occupiedTables = tables.filter((t) => t.currentOrderId).length;
    const tableTurnover = tables.length > 0 ? (occupiedTables / tables.length) * 100 : 0;

    return NextResponse.json({
      date,
      sales: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalOrders,
        completedOrders,
        byMethod: salesByMethod,
      },
      waiters: Object.values(waiterPerformance).sort((a, b) => b.ordersTaken - a.ordersTaken),
      kitchen: {
        totalItems: kitchenStats.totalItems,
        deliveredItems: kitchenStats.deliveredItems,
        avgPrepTimeMinutes: Math.round(avgPrepTime * 100) / 100,
        avgActualTimeMinutes: Math.round(avgActualTime * 100) / 100,
        delayedItems: kitchenStats.delayedItems,
        delayRatePercent: Math.round(delayRate * 100) / 100,
      },
      tables: {
        total: tables.length,
        occupied: occupiedTables,
        available: tables.length - occupiedTables,
        turnoverRatePercent: Math.round(tableTurnover * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Daily report error:", error);
    return NextResponse.json({ error: "Failed to generate daily report" }, { status: 500 });
  }
}
