import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { paramIdInputSchema } from "@lib/validation/order";
import { createAuditLog } from "@lib/order/audit";

const statusSchema = z.object({
  status: z.enum(["PENDING", "COOKING", "READY", "COMPLETED"]),
});

import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const validTransitions: Record<string, string[]> = {
  PENDING: ["COOKING"],
  COOKING: ["READY", "PENDING"],
  READY: ["COMPLETED"],
  COMPLETED: [],
};

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const paramValidation = paramIdInputSchema.safeParse({ id });

    if (!paramValidation.success) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const orderId = paramValidation.data.id;

    const body = await req.json();
    const validationResult = statusSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const newStatus = validationResult.data.status;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, tableId: true, totalAmount: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const allowedTransitions = validTransitions[order.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from ${order.status} to ${newStatus}` },
        { status: 409 }
      );
    }

    const updateData: { status: string; completedAt?: Date } = {
      status: newStatus,
    };

    if (newStatus === "COMPLETED") {
      updateData.completedAt = new Date();
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: { include: { menuItem: true } },
        waiter: { select: { id: true, name: true } },
        table: { select: { id: true, number: true } },
      },
    });

    if (order.tableId && newStatus === "COMPLETED") {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: "AVAILABLE", currentOrderId: null },
      });
    }

    await createAuditLog({
      userId: authUser.userId,
      action: "MODIFY_ORDER",
      orderId,
      details: {
        statusChanged: true,
        from: order.status,
        to: newStatus,
      },
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error("Update order status error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}