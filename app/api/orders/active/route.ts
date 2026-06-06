import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import {
  orderQueryInputSchema,
  type OrderQueryInput,
} from "@lib/validation/order";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const queryParams: Partial<OrderQueryInput> = {};

    const tableId = searchParams.get("tableId");
    const waiterId = searchParams.get("waiterId");
    const status = searchParams.get("status");

    if (tableId) queryParams.tableId = tableId;
    if (waiterId) queryParams.waiterId = waiterId;
    if (status) queryParams.status = status as OrderQueryInput["status"];

    if (Object.keys(queryParams).length > 0) {
      const validationResult = orderQueryInputSchema.safeParse(queryParams);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: validationResult.error.flatten() },
          { status: 400 }
        );
      }
    }

    const orders = await prisma.order.findMany({
      where: {
        ...(queryParams.tableId && { tableId: queryParams.tableId }),
        ...(queryParams.waiterId && { waiterId: queryParams.waiterId }),
        ...(queryParams.status && { status: queryParams.status }),
        ...(!queryParams.status && { status: { not: "COMPLETED" } }),
      },
      include: {
        items: {
          include: { menuItem: true },
        },
        waiter: { select: { id: true, name: true } },
        table: { select: { id: true, number: true, capacity: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = Date.now();

    const enrichedOrders = orders.map((order) => {
      const alertItems = order.items.map((item) => {
        const prepTime = item.menuItem.preparationTime;
        const createdAt = new Date(item.createdAt).getTime();
        const elapsedMinutes = (now - createdAt) / (1000 * 60);
        const isDelayed = item.status === "PENDING" && elapsedMinutes > prepTime;

        return {
          ...item,
          menuItem: item.menuItem,
          prepTimeMinutes: prepTime,
          elapsedMinutes: Math.round(elapsedMinutes),
          isDelayed,
          status: item.status,
        };
      });

      const hasDelayedItems = alertItems.some((item) => item.isDelayed);

      return {
        id: order.id,
        tableId: order.tableId,
        tableNumber: order.table?.number,
        waiterId: order.waiterId,
        waiterName: order.waiter?.name,
        type: order.type,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt.toISOString(),
        completedAt: order.completedAt?.toISOString() || null,
        items: alertItems,
        hasDelayedItems,
      };
    });

    return NextResponse.json({ orders: enrichedOrders });
  } catch (error) {
    console.error("Get active orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}