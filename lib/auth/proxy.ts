import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./token";
import prisma from "@lib/prisma";
import { auth } from "./better-auth";
import type { UserRole } from "./types";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  restaurantId: string;
  waiterSessionId?: string;
}

export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  const token = getTokenFromRequest(req);

  if (token) {
    const payload = await verifyToken(token);

    if (payload) {
      if (payload.role === "WAITER") {
        if (!payload.waiterSessionId) {
          return null;
        }

        const session = await prisma.waiterSession.findFirst({
          where: {
            id: payload.waiterSessionId,
            waiterId: payload.userId,
            isActive: true,
            destroyedAt: null,
          },
          select: { id: true },
        });

        if (!session) {
          return null;
        }
      }

      return {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        restaurantId: payload.restaurantId,
        waiterSessionId: payload.waiterSessionId,
      };
    }
  }

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.email) {
    return null;
  }

  const admin = await prisma.user.findFirst({
    where: {
      email: session.user.email.toLowerCase(),
      role: { in: ["SUPER_ADMIN", "MANAGER", "COUNTER"] },
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      restaurantId: true,
    },
  });

  if (!admin) {
    return null;
  }

  return {
    userId: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role as UserRole,
    restaurantId: admin.restaurantId,
  };
}

export function requireAuth(
  getAuthenticatedUser: (req: NextRequest) => Promise<AuthenticatedUser | null>
) {
  return async function (req: NextRequest) {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return user;
  };
}

export function requireRole(...allowedRoles: UserRole[]) {
  return async function (req: NextRequest) {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return user;
  };
}

export function createMiddleware() {
  return async function middleware(req: NextRequest) {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const request = req;
    (request as NextRequest & { auth: AuthenticatedUser }).auth = user;

    return null;
  };
}

function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/pos-session=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

export function requireAdmin(req: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  return requireRole("SUPER_ADMIN", "MANAGER", "COUNTER")(req) as Promise<AuthenticatedUser | NextResponse>;
}

export function requireWaiterOrAdmin(req: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  const userPromise = getAuthenticatedUser(req);

  return (async () => {
    const user = await userPromise;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return user;
  })() as Promise<AuthenticatedUser | NextResponse>;
}
