import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { emitToTable, emitToRestaurant } from "@lib/socket/server";
import { logPaymentConfirmed } from "@lib/order/audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ConfirmPaymentBody {
  paymentId: string;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role === "WAITER") {
      return NextResponse.json(
        { error: "Only admins can confirm payments" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: true } },
        table: { select: { id: true, number: true } },
        waiter: { select: { id: true, name: true } },
        payments: {
          include: {
            initiator: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus !== "PENDING_CONFIRMATION") {
      return NextResponse.json(
        { error: "No pending payment request" },
        { status: 409 }
      );
    }

    const body: ConfirmPaymentBody = await req.json();
    const { paymentId } = body;

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

    if (payment.status === "CONFIRMED") {
      return NextResponse.json(
        { error: "Payment already confirmed" },
        { status: 409 }
      );
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "CONFIRMED",
        confirmedBy: authUser.userId,
      },
      include: {
        initiator: { select: { id: true, name: true } },
        confirmer: { select: { id: true, name: true } },
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: "CONFIRMED",
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    if (order.table) {
      await prisma.table.update({
        where: { id: order.table.id },
        data: {
          status: "AVAILABLE",
          currentOrderId: null,
        },
      });
    }

    await logPaymentConfirmed(authUser.userId, order.id, paymentId, order.totalAmount);

    const receipt = {
      orderId: order.id,
      tableNumber: order.table?.number,
      waiterName: order.waiter?.name,
      payment: {
        id: updatedPayment.id,
        method: updatedPayment.method,
        amount: updatedPayment.amount,
        status: updatedPayment.status,
        initiatedBy: updatedPayment.initiator?.name,
        confirmedBy: updatedPayment.confirmer?.name,
        createdAt: updatedPayment.createdAt.toISOString(),
        confirmedAt: updatedPayment.confirmer ? new Date().toISOString() : null,
      },
      items: order.items.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity,
      })),
      subtotal: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      tax: order.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.1,
      total: order.totalAmount,
      completedAt: new Date().toISOString(),
    };

    emitToRestaurant(authUser.restaurantId, "payment:confirmed", {
      orderId: order.id,
      paymentId: updatedPayment.id,
      amount: updatedPayment.amount,
      method: updatedPayment.method as "CASH" | "CARD" | "UPI",
      status: "CONFIRMED",
      initiatedBy: authUser.userId,
      confirmedBy: authUser.userId,
      confirmedAt: new Date().toISOString(),
      createdAt: updatedPayment.createdAt.toISOString(),
    });

    if (order.table) {
      emitToTable(order.table.number.toString(), "payment:confirmed", {
        orderId: order.id,
        paymentId: updatedPayment.id,
        amount: updatedPayment.amount,
        method: updatedPayment.method as "CASH" | "CARD" | "UPI",
        status: "CONFIRMED",
        initiatedBy: authUser.userId,
        confirmedBy: authUser.userId,
        confirmedAt: new Date().toISOString(),
        createdAt: updatedPayment.createdAt.toISOString(),
      });
    }

    return NextResponse.json({
      receipt,
      message: "Payment confirmed successfully",
    });
  } catch (error) {
    console.error("Confirm payment error:", error);
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}
