import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { emitToTable, emitToKitchen } from "@lib/socket/server";
import { logItemDelivered } from "@lib/order/audit";

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId, itemId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        table: { select: { number: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (item.status !== "READY") {
      return NextResponse.json(
        { error: "Item must be READY before delivery" },
        { status: 409 }
      );
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
        deliveredBy: authUser.userId,
      },
      include: { menuItem: true },
    });

    await logItemDelivered(
      authUser.userId,
      orderId,
      itemId,
      item.menuItem.name
    );

    if (order.table) {
      emitToTable(order.table.number.toString(), "item:delivered", {
        orderId,
        itemId: updatedItem.id,
        menuItemId: updatedItem.menuItemId,
        name: updatedItem.menuItem.name,
        quantity: updatedItem.quantity,
        status: "DELIVERED",
        deliveredBy: authUser.userId,
        deliveredAt: updatedItem.deliveredAt?.toISOString(),
        tableNumber: order.table.number,
      });
    }

    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
    });

    const allDelivered = allItems.every(
      (i) => i.status === "DELIVERED" || i.status === "COMPLETED"
    );

    if (allDelivered) {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "READY" },
      });

      emitToKitchen(authUser.restaurantId, "order:ready", {
        orderId,
        tableNumber: order.table?.number,
      });

      if (order.table) {
        emitToTable(order.table.number.toString(), "order:ready", {
          orderId,
          tableNumber: order.table.number,
        });
      }
    }

    return NextResponse.json({
      item: updatedItem,
      order: {
        ...order,
        status: allDelivered ? "READY" : order.status,
        allItemsDelivered: allDelivered,
      },
    });
  } catch (error) {
    console.error("Deliver item error:", error);
    return NextResponse.json(
      { error: "Failed to deliver item" },
      { status: 500 }
    );
  }
}