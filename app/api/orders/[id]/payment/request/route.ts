import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { emitToKitchen, emitToRestaurant } from "@lib/socket/server";
import { logPaymentInitiated } from "@lib/order/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RequestPaymentBody {
  method: "CASH" | "CARD" | "UPI";
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } },
        table: { select: { number: true } },
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "CONFIRMED") {
      return NextResponse.json(
        { error: "Payment already confirmed" },
        { status: 409 }
      );
    }

    if (order.paymentStatus === "PENDING_CONFIRMATION") {
      return NextResponse.json(
        { error: "Payment request already pending" },
        { status: 409 }
      );
    }

    const body: RequestPaymentBody = await req.json();
    const { method } = body;

    if (!["CASH", "CARD", "UPI"].includes(method)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: order.totalAmount,
        method,
        status: "PENDING",
        initiatedBy: authUser.userId,
      },
      include: {
        initiator: { select: { id: true, name: true } },
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "PENDING_CONFIRMATION",
      },
    });

    await logPaymentInitiated(authUser.userId, order.id, payment.id, order.totalAmount);

    emitToRestaurant(authUser.restaurantId, "payment:requested", {
      orderId: order.id,
      paymentId: payment.id,
      amount: payment.amount,
      method: payment.method as "CASH" | "CARD" | "UPI",
      status: "PENDING",
      initiatedBy: authUser.userId,
      initiatedByName: authUser.name,
      createdAt: payment.createdAt.toISOString(),
    });

    emitToKitchen(authUser.restaurantId, "payment:requested", {
      orderId: order.id,
      paymentId: payment.id,
      amount: payment.amount,
      method: payment.method as "CASH" | "CARD" | "UPI",
      status: "PENDING",
      initiatedBy: authUser.userId,
      initiatedByName: authUser.name,
      createdAt: payment.createdAt.toISOString(),
    });

    return NextResponse.json({
      payment: {
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        initiatedBy: payment.initiatedBy,
        initiatedByName: payment.initiator?.name,
        createdAt: payment.createdAt.toISOString(),
      },
      order: {
        id: order.id,
        paymentStatus: "PENDING_CONFIRMATION",
      },
    });
  } catch (error) {
    console.error("Request payment error:", error);
    return NextResponse.json(
      { error: "Failed to request payment" },
      { status: 500 }
    );
  }
}