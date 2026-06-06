import { NextRequest, NextResponse } from "next/server";
import { createToken } from "@lib/auth/token";
import prisma from "@lib/prisma";
import type { AuthResponse, UserRole } from "@lib/auth/types";
import { createOrUpdateWaiterSession, WaiterPinInUseError } from "@lib/waiter/session-management";

interface LoginBody {
  pin: string;
  email?: string;
  deviceId?: string;
  deviceName?: string;
  deviceOS?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  restaurantId: string;
}

async function validatePin(pin: string, email?: string): Promise<User | null> {
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return null;
  }

  const whereClause = email
    ? { pin, email: email.toLowerCase() }
    : { pin };

  const user = await prisma.user.findFirst({
    where: whereClause,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      restaurantId: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return user;
}

export async function POST(req: NextRequest) {
  try {
    const body: LoginBody = await req.json();
    const { pin, email, deviceId, deviceName, deviceOS } = body;

    if (!pin) {
      return NextResponse.json(
        { error: "PIN is required" },
        { status: 400 }
      );
    }

    const user = await validatePin(pin, email);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid PIN" },
        { status: 401 }
      );
    }

    const requestHeaders = new Headers(req.headers);
    const isMobile = requestHeaders.get("x-app-type") === "mobile" || !!deviceId;
    let waiterSession: { id: string; deviceId: string } | undefined;

    // Handle mobile device session tracking
    if (isMobile) {
      if (user.role !== "WAITER") {
        return NextResponse.json(
          { error: "Mobile PIN login is only available for waiter accounts" },
          { status: 403 }
        );
      }

      if (!deviceId) {
        return NextResponse.json(
          { error: "deviceId is required for mobile login" },
          { status: 400 }
        );
      }

      const session = await createOrUpdateWaiterSession({
        waiterId: user.id,
        deviceId,
        pin,
        deviceName: deviceName || undefined,
        deviceOS: deviceOS || undefined,
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      });

      waiterSession = { id: session.id, deviceId: session.deviceId };
    }

    const { token, expiresAt } = await createToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      restaurantId: user.restaurantId,
      waiterSessionId: waiterSession?.id,
    });

    const response: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        isActive: user.isActive,
      },
      token,
      expiresAt: expiresAt.toISOString(),
      session: waiterSession,
    };

    if (isMobile) {
      return NextResponse.json(response, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(response, {
      headers: {
        "Set-Cookie": `pos-session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${8 * 60 * 60}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof WaiterPinInUseError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
