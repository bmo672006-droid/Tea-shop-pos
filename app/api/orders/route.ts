import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import {
  createOrderInputSchema,
  type CreateOrderInput,
} from "@lib/validation/order";
import { logOrderCreated } from "@lib/order/audit";

const TAX_RATE = 0.1;

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateOrderInput = await req.json();
    const validationResult = createOrderInputSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { tableId, type, items } = validationResult.data;

    if (tableId) {
      const activeOrder = await prisma.order.findFirst({
        where: {
          tableId,
          status: { not: "COMPLETED" },
        },
        select: { id: true },
      });

      if (activeOrder) {
        return NextResponse.json(
          { error: "Table already has an active order" },
          { status: 409 }
        );
      }

      const table = await prisma.table.findUnique({
        where: { id: tableId },
        select: { id: true, number: true },
      });

      if (!table) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      }
    }

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

    const orderItemsData = items.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      price: menuItemMap.get(item.menuItemId)!.price,
      notes: item.notes || null,
      status: "PENDING" as const,
    }));

    const subtotal = orderItemsData.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * TAX_RATE;
    const totalAmount = subtotal + tax;

    const order = await prisma.order.create({
      data: {
        tableId: tableId || null,
        waiterId: authUser.userId,
        type,
        status: "PENDING",
        paymentStatus: "PENDING",
        totalAmount,
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: { menuItem: true },
        },
        waiter: { select: { id: true, name: true } },
        table: { select: { id: true, number: true } },
      },
    });

    if (tableId) {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: "OCCUPIED", currentOrderId: order.id },
      });
    }

    await logOrderCreated(
      authUser.userId,
      order.id,
      tableId,
      orderItemsData.length,
      totalAmount
    );

    const response = {
      order: {
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
        items: order.items.map((item) => ({
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
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
