import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { canManageAdmins, canManageWaiters } from "@lib/admin/rbac";
import { generateUniquePIN, isPINInUse, validatePINFormat } from "@lib/waiter/pin-generator";
import { deleteAllWaiterSessions } from "@lib/waiter/session-management";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

interface ResetPinBody {
  pin?: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const body: ResetPinBody = await request.json();

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const canResetPin =
      targetUser.role === "WAITER"
        ? canManageWaiters(authUser.role)
        : canManageAdmins(authUser.role);

    if (!canResetPin) {
      return NextResponse.json({ error: "Forbidden: You cannot reset this PIN" }, { status: 403 });
    }

    const nextPin = body.pin?.trim() || await generateUniquePIN(userId);
    const validation = validatePINFormat(nextPin);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    if (await isPINInUse(nextPin, userId)) {
      return NextResponse.json(
        { error: "PIN is already in use by another account" },
        { status: 409 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { pin: nextPin },
      select: {
        id: true,
        email: true,
        name: true,
        pin: true,
      },
    });

    if (targetUser.role === "WAITER") {
      await deleteAllWaiterSessions(userId);
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("Error resetting PIN:", error);
    return NextResponse.json({ error: "Failed to reset PIN" }, { status: 500 });
  }
}
