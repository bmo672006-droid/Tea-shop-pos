import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { paramIdInputSchema } from "@lib/validation/order";
import { calculateBill } from "@lib/order/calculations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
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
      include: {
        items: {
          include: { menuItem: true },
        },
        waiter: { select: { name: true } },
        table: { select: { number: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const bill = calculateBill(order);

    return NextResponse.json({ bill });
  } catch (error) {
    console.error("Get bill error:", error);
    return NextResponse.json({ error: "Failed to generate bill" }, { status: 500 });
  }
}
