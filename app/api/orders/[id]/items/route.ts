import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import {
  updateOrderItemsInputSchema,
  paramIdInputSchema,
  type UpdateOrderItemsInput,
} from "@lib/validation/order";
import { logOrderModified } from "@lib/order/audit";

const TAX_RATE = 0.1;

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const paramValidation = paramIdInputSchema.safeParse({ id });

    if (!paramValidation.success) {
      return NextResponse.json(
        { error: "Invalid order ID" },
        { status: 400 }
      );
    }

    const orderId = paramValidation.data.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        waiterId: true,
        tableId: true,
        totalAmount: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "PENDING" && order.status !== "COOKING") {
      return NextResponse.json(
        { error: "Cannot modify order - status is not PENDING or COOKING" },
        { status: 409 }
      );
    }

    if (order.paymentStatus === "PENDING_CONFIRMATION" || order.paymentStatus === "CONFIRMED") {
      return NextResponse.json(
        { error: "Cannot modify order - payment is being processed or completed" },
        { status: 409 }
      );
    }

    const body: UpdateOrderItemsInput = await req.json();
    const validationResult = updateOrderItemsInputSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { items } = validationResult.data;

    const menuItemIds = items.map((item) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      select: { id: true, name: true, price: true, preparationTime: true, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      return NextResponse.json(
        { error: "One or more menu items not found" },
        { status: 404 }
      );
    }

    const unavailableItems = menuItems.filter((item) => !item.isAvailable);
    if (unavailableItems.length > 0) {
      return NextResponse.json(
        {
          error: "Some items are unavailable",
          items: unavailableItems.map((item) => item.name),
        },
        { status: 400 }
      );
    }

    const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));

    const existingItems = await prisma.orderItem.findMany({
      where: { orderId },
      select: { id: true, menuItemId: true, quantity: true },
    });

    const existingItemMap = new Map(
      existingItems.map((item) => [item.menuItemId, item])
    );

    const changes: {
      added: Array<{ menuItemId: string; name: string; quantity: number }>;
      updated: Array<{ menuItemId: string; name: string; oldQty: number; newQty: number }>;
    } = { added: [], updated: [] };

    for (const item of items) {
      const menuItem = menuItemMap.get(item.menuItemId)!;
      const existing = existingItemMap.get(item.menuItemId);

      if (existing) {
        if (existing.quantity !== item.quantity) {
          changes.updated.push({
            menuItemId: item.menuItemId,
            name: menuItem.name,
            oldQty: existing.quantity,
            newQty: item.quantity,
          });
        }
      } else {
        changes.added.push({
          menuItemId: item.menuItemId,
          name: menuItem.name,
          quantity: item.quantity,
        });
      }
    }

    if (changes.added.length === 0 && changes.updated.length === 0) {
      return NextResponse.json(
        { error: "No changes to apply" },
        { status: 400 }
      );
    }

    const upsertOperations = items.map((item) => {
      const menuItem = menuItemMap.get(item.menuItemId)!;
      return prisma.orderItem.upsert({
        where: {
          id: existingItemMap.get(item.menuItemId)?.id || "new",
        },
        create: {
          orderId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: menuItem.price,
          notes: item.notes || null,
          status: "PENDING",
        },
        update: {
          quantity: item.quantity,
          ...(item.notes && { notes: item.notes }),
        },
      });
    });

    await prisma.$transaction(upsertOperations);

    const allItems = await prisma.orderItem.findMany({
      where: { orderId },
      include: { menuItem: true },
    });

    const subtotal = allItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * TAX_RATE;
    const totalAmount = subtotal + tax;

    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount },
    });

    await logOrderModified(authUser.userId, orderId, {
      changes,
      totalAmount: Math.round(totalAmount * 100) / 100,
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true } },
        waiter: { select: { id: true, name: true } },
        table: { select: { id: true, number: true } },
      },
    });

    return NextResponse.json({
      order: {
        id: updatedOrder!.id,
        tableId: updatedOrder!.tableId,
        tableNumber: updatedOrder!.table?.number,
        type: updatedOrder!.type,
        status: updatedOrder!.status,
        paymentStatus: updatedOrder!.paymentStatus,
        totalAmount: Math.round(totalAmount * 100) / 100,
        createdAt: updatedOrder!.createdAt.toISOString(),
        items: allItems.map((item) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          name: item.menuItem.name,
          quantity: item.quantity,
          price: item.price,
          status: item.status,
          notes: item.notes,
        })),
      },
      totals: {
        subtotal: Math.round(subtotal * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(totalAmount * 100) / 100,
      },
      changes,
    });
  } catch (error) {
    console.error("Update order items error:", error);
    return NextResponse.json({ error: "Failed to update order items" }, { status: 500 });
  }
}
