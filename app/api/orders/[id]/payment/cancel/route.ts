import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { emitToKitchen, emitToRestaurant } from "@lib/socket/server";
import { SOCKET_EVENTS } from "@lib/socket/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CancelPaymentBody {
  paymentId: string;
  reason?: string;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role === "WAITER") {
      return NextResponse.json(
        { error: "Only admins can cancel payment requests" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: { select: { id: true, number: true } },
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus !== "PENDING_CONFIRMATION") {
      return NextResponse.json(
        { error: "No pending payment request to cancel" },
        { status: 409 }
      );
    }

    const body: CancelPaymentBody = await req.json();
    const { paymentId, reason } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    const payment = order.payments.find((p) => p.id === paymentId);
    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: "CANCELLED" },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PENDING" },
    });

    emitToRestaurant(authUser.restaurantId, SOCKET_EVENTS.PAYMENT_CANCELLED, {
      orderId: order.id,
      paymentId,
      reason: reason || "Payment cancelled by admin",
    });

    if (order.table) {
      emitToKitchen(authUser.restaurantId, SOCKET_EVENTS.PAYMENT_CANCELLED, {
        orderId: order.id,
        paymentId,
        reason: reason || "Payment cancelled by admin",
      });
    }

    return NextResponse.json({
      order: {
        id: order.id,
        paymentStatus: "PENDING",
        message: "Payment request cancelled, order editing restored",
      },
    });
  } catch (error) {
    console.error("Cancel payment error:", error);
    return NextResponse.json(
      { error: "Failed to cancel payment" },
      { status: 500 }
    );
  }
}