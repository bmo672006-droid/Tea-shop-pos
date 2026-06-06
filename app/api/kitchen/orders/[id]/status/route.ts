import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { emitToKitchen, emitToTable } from "@lib/socket/server";
import { createAuditLog } from "@lib/order/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "SUPER_ADMIN" && authUser.role !== "MANAGER" && authUser.role !== "COUNTER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } },
        table: { select: { number: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await req.json();
    const { status, itemId } = body;

    if (!["PENDING", "COOKING", "READY", "COMPLETED", "DELIVERED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const validTransitions: Record<string, string[]> = {
      PENDING: ["COOKING", "DELIVERED"],
      COOKING: ["READY", "PENDING", "DELIVERED"],
      READY: ["COMPLETED", "DELIVERED"],
      COMPLETED: [],
      DELIVERED: [],
    };

    if (itemId) {
      const item = order.items.find((i) => i.id === itemId);
      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      const allowed = validTransitions[item.status] || [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${item.status} to ${status}` },
          { status: 409 }
        );
      }

      await prisma.orderItem.update({
        where: { id: itemId },
        data: { status },
      });

      const updatedItem = await prisma.orderItem.findUnique({
        where: { id: itemId },
        include: { menuItem: true },
      });

      if (status === "READY" && order.table) {
        emitToTable(order.table!.number!.toString(), "item:ready", {
          orderId: order.id,
          itemId: updatedItem!.id,
          menuItemId: updatedItem!.menuItemId,
          name: updatedItem!.menuItem.name,
          quantity: updatedItem!.quantity,
          status: updatedItem!.status as "PENDING" | "COOKING" | "READY" | "DELIVERED",
          tableNumber: order.table!.number,
        });
      }

      const allReady = order.items.every(
        (i) => i.id === itemId ? status === "READY" : i.status === "READY" || i.status === "COMPLETED" || i.status === "DELIVERED"
      );

      if (allReady) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "READY" },
        });

        emitToKitchen(authUser.restaurantId, "order:ready", {
          orderId: order.id,
          tableNumber: order.table?.number,
        });
      }

      return NextResponse.json({
        item: updatedItem,
        order: {
          ...order,
          status: allReady ? "READY" : order.status,
        },
      });
    }

    const allowed = validTransitions[order.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${status}` },
        { status: 409 }
      );
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
      include: {
        items: { include: { menuItem: true } },
        waiter: { select: { id: true, name: true } },
        table: { select: { id: true, number: true } },
      },
    });

    if (status === "READY") {
      emitToKitchen(authUser.restaurantId, "order:ready", {
        orderId: order.id,
        tableNumber: order.table?.number,
      });

      if (order.table) {
        emitToTable(order.table.number.toString(), "order:ready", {
          orderId: order.id,
          tableNumber: order.table.number,
        });
      }
    }

    await createAuditLog({
      userId: authUser.userId,
      action: "MODIFY_ORDER",
      orderId: order.id,
      details: {
        statusChanged: true,
        from: order.status,
        to: status,
      },
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("Update kitchen order status error:", error);
    return NextResponse.json(
      { error: "Failed to update order status" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  return POST(req, context);
}
