import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { createOrUpdateWaiterSession, WaiterPinInUseError } from "@lib/waiter/session-management";

interface WaiterLoginRequest {
  pin: string;
  deviceId: string;
  deviceName?: string;
  deviceOS?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: WaiterLoginRequest = await request.json();

    if (!body.pin || !body.deviceId) {
      return NextResponse.json(
        { error: "Missing required fields: pin, deviceId" },
        { status: 400 }
      );
    }

    // Find waiter by PIN
    const waiter = await prisma.user.findUnique({
      where: { pin: body.pin },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        role: true,
        isActive: true,
      },
    });

    if (!waiter) {
      return NextResponse.json(
        { error: "Invalid PIN" },
        { status: 401 }
      );
    }

    if (waiter.role !== "WAITER") {
      return NextResponse.json(
        { error: "This PIN is not for a waiter account" },
        { status: 401 }
      );
    }

    if (!waiter.isActive) {
      return NextResponse.json(
        { error: "Waiter account is deactivated" },
        { status: 403 }
      );
    }

    // Create or update session
    const session = await createOrUpdateWaiterSession({
      waiterId: waiter.id,
      deviceId: body.deviceId,
      pin: body.pin,
      deviceName: body.deviceName,
      deviceOS: body.deviceOS,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      success: true,
      waiter: {
        id: waiter.id,
        name: waiter.name,
        email: waiter.email,
        role: waiter.role,
      },
      session: {
        id: session.id,
        deviceId: session.deviceId,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof WaiterPinInUseError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error("Error in waiter login:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}

/**
 * Verify session is still active (called by mobile app to check if session was revoked)
 */
interface VerifySessionRequest {
  sessionId: string;
  deviceId: string;
}

export async function PUT(request: NextRequest) {
  try {
    const body: VerifySessionRequest = await request.json();

    if (!body.sessionId || !body.deviceId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, deviceId" },
        { status: 400 }
      );
    }

    const session = await prisma.waiterSession.findUnique({
      where: { id: body.sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    if (session.deviceId !== body.deviceId) {
      return NextResponse.json(
        { error: "Device ID mismatch" },
        { status: 401 }
      );
    }

    // Check if session is still active
    if (!session.isActive || session.destroyedAt) {
      return NextResponse.json(
        { 
          error: "Session has been terminated",
          shouldLogout: true 
        },
        { status: 401 }
      );
    }

    // Update last sync time
    await prisma.waiterSession.update({
      where: { id: body.sessionId },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      valid: true,
      shouldLogout: false,
    });
  } catch (error) {
    console.error("Error verifying waiter session:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
