import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { canManageWaiters } from "@lib/admin/rbac";
import { generateUniquePIN, validatePINFormat, isPINInUse } from "@lib/waiter/pin-generator";
import { logWaiterUpdated } from "@lib/admin/audit";

interface RegeneratePINRequest {
  waiterId: string;
  newPin?: string; // Optional custom PIN, otherwise auto-generate
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageWaiters(authUser.role)) {
      return NextResponse.json(
        {
          error:
            "Forbidden: You don't have permission to manage waiter PINs",
        },
        { status: 403 }
      );
    }

    const body: RegeneratePINRequest = await request.json();

    if (!body.waiterId) {
      return NextResponse.json(
        { error: "Missing required field: waiterId" },
        { status: 400 }
      );
    }

    // Verify waiter exists
    const waiter = await prisma.user.findUnique({
      where: { id: body.waiterId },
      select: { id: true, name: true, email: true, role: true, pin: true },
    });

    if (!waiter) {
      return NextResponse.json({ error: "Waiter not found" }, { status: 404 });
    }

    if (waiter.role !== "WAITER") {
      return NextResponse.json(
        { error: "User is not a waiter" },
        { status: 400 }
      );
    }

    let newPin: string;

    if (body.newPin) {
      // Validate provided PIN
      const validation = validatePINFormat(body.newPin);
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Validation failed", details: [validation.error] },
          { status: 400 }
        );
      }

      // Check if PIN is already in use
      const inUse = await isPINInUse(body.newPin, body.waiterId);
      if (inUse) {
        return NextResponse.json(
          { error: "PIN is already in use by another waiter" },
          { status: 409 }
        );
      }

      newPin = body.newPin;
    } else {
      // Auto-generate unique PIN
      newPin = await generateUniquePIN(body.waiterId);
    }

    // Update waiter with new PIN
    const updatedWaiter = await prisma.user.update({
      where: { id: body.waiterId },
      data: { pin: newPin },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        role: true,
        isActive: true,
      },
    });

    // Log the PIN change
    await logWaiterUpdated(authUser.userId, body.waiterId, {
      pin: "***", // Don't log actual PIN
      previousPin: "***",
    });

    return NextResponse.json({
      success: true,
      waiter: {
        id: updatedWaiter.id,
        name: updatedWaiter.name,
        email: updatedWaiter.email,
        pin: updatedWaiter.pin,
      },
    });
  } catch (error) {
    console.error("Error regenerating waiter PIN:", error);
    return NextResponse.json(
      { error: "Failed to regenerate PIN" },
      { status: 500 }
    );
  }
}
