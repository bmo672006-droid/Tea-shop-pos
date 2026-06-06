import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { canManageWaiters } from "@lib/admin/rbac";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(_request);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageWaiters(authUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const session = await prisma.waiterSession.findUnique({
      where: { id },
      include: {
        waiter: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await prisma.waiterSession.update({
      where: { id },
      data: {
        isActive: false,
        destroyedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Session terminated for ${session.waiter.name}`,
      waiter: session.waiter,
    });
  } catch (error) {
    console.error("Error terminating session:", error);
    return NextResponse.json({ error: "Failed to terminate session" }, { status: 500 });
  }
}
