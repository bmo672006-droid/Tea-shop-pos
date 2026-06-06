import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tables = await prisma.table.findMany({
      orderBy: { number: "asc" },
    });

    const tablesWithOrder = await Promise.all(
      tables.map(async (table) => {
        const activeOrder = table.currentOrderId
          ? await prisma.order.findFirst({
              where: {
                id: table.currentOrderId,
                status: { not: "COMPLETED" },
              },
              select: { id: true, status: true, paymentStatus: true, totalAmount: true },
            })
          : null;

        return {
          id: table.id,
          number: table.number,
          capacity: table.capacity,
          status: table.status,
          currentOrderId: table.currentOrderId,
          activeOrder: activeOrder,
        };
      })
    );

    return NextResponse.json({ tables: tablesWithOrder });
  } catch (error) {
    console.error("Get tables error:", error);
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role === "WAITER") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { number, capacity } = body;

    if (!number || !capacity) {
      return NextResponse.json(
        { error: "Number and capacity required" },
        { status: 400 }
      );
    }

    const existing = await prisma.table.findUnique({
      where: { number },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Table number already exists" },
        { status: 409 }
      );
    }

    const table = await prisma.table.create({
      data: {
        number,
        capacity,
        status: "AVAILABLE",
      },
    });

    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    console.error("Create table error:", error);
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Table ID and status required" },
        { status: 400 }
      );
    }

    const table = await prisma.table.findUnique({
      where: { id },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const updated = await prisma.table.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ table: updated });
  } catch (error) {
    console.error("Update table status error:", error);
    return NextResponse.json({ error: "Failed to update table" }, { status: 500 });
  }
}
