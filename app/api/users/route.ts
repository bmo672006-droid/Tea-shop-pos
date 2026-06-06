import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { canManageAdmins, canManageWaiters, canModifyRole } from "@lib/admin/rbac";
import {
  validateCreateAdminDto,
  validateCreateWaiterDto,
} from "@lib/admin/validation";
import {
  logAdminCreated,
  logWaiterCreated,
} from "@lib/admin/audit";
import { generateUniquePIN, validatePINFormat, isPINInUse } from "@lib/waiter/pin-generator";
import type { UserRole } from "@lib/auth/types";
import type { Prisma } from "@/app/generated/prisma/client";
import { randomUUID } from "crypto";

interface CreateUserBody {
  email?: string;
  name: string;
  pin?: string; // Optional - will auto-generate for waiters
  role: UserRole;
}

async function generateInternalWaiterEmail(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const email = `waiter-${randomUUID()}@pos.local`;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) return email;
  }

  throw new Error("Failed to generate waiter email");
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const roleFilter = url.searchParams.get("role");

    // Determine what users the requester can view
    const adminCanViewAdmins = canManageAdmins(authUser.role);
    const adminCanViewWaiters = canManageWaiters(authUser.role);

    if (!adminCanViewAdmins && !adminCanViewWaiters) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to view users" },
        { status: 403 }
      );
    }

    const whereCondition: Prisma.UserWhereInput = {};

    if (roleFilter) {
      // If role filter is provided, ensure user can view that role
      if (roleFilter === "WAITER" && !adminCanViewWaiters) {
        return NextResponse.json(
          { error: "Forbidden: You don't have permission to view waiters" },
          { status: 403 }
        );
      }
      if (roleFilter !== "WAITER" && !adminCanViewAdmins) {
        return NextResponse.json(
          { error: "Forbidden: You don't have permission to view admins" },
          { status: 403 }
        );
      }
      whereCondition.role = roleFilter;
    } else {
      // If no filter, apply default visibility rules
      const visibleRoles: string[] = [];

      if (adminCanViewAdmins) {
        // Can view all admin roles except those they can't modify
        if (authUser.role === "SUPER_ADMIN") {
          visibleRoles.push("SUPER_ADMIN", "MANAGER", "COUNTER");
        } else if (authUser.role === "MANAGER") {
          visibleRoles.push("MANAGER", "COUNTER");
        }
      }

      if (adminCanViewWaiters) {
        visibleRoles.push("WAITER");
      }

      if (visibleRoles.length > 0) {
        whereCondition.role = { in: visibleRoles };
      } else {
        return NextResponse.json({ error: "No users available to view" }, { status: 403 });
      }
    }

    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pin: true,
        isActive: true,
        restaurantId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateUserBody = await request.json();

    if (!body.name || !body.role) {
      return NextResponse.json(
        { error: "Missing required fields: name, role" },
        { status: 400 }
      );
    }

    let finalEmail = body.email?.trim().toLowerCase();

    // Validate request body
    if (body.role === "WAITER") {
      // Creating a waiter
      if (!canManageWaiters(authUser.role)) {
        return NextResponse.json(
          {
            error: "Forbidden: You don't have permission to create waiters",
          },
          { status: 403 }
        );
      }

      // For waiters, auto-generate PIN if not provided
      let finalPin = body.pin;
      if (!finalPin) {
        finalPin = await generateUniquePIN();
      } else {
        const validation = validatePINFormat(finalPin);
        if (!validation.valid) {
          return NextResponse.json(
            { error: "Validation failed", details: [validation.error] },
            { status: 400 }
          );
        }

        // Check if PIN is already in use
        const inUse = await isPINInUse(finalPin);
        if (inUse) {
          return NextResponse.json(
            { error: "PIN is already in use by another waiter" },
            { status: 409 }
          );
        }
      }

      // Validate waiter data
      if (!finalEmail) {
        finalEmail = await generateInternalWaiterEmail();
      }

      const validation = validateCreateWaiterDto({
        ...body,
        email: finalEmail,
        pin: finalPin,
      });
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Validation failed", details: validation.errors },
          { status: 400 }
        );
      }

      body.pin = finalPin;
    } else {
      // Creating an admin (SUPER_ADMIN, MANAGER, COUNTER)
      if (!finalEmail) {
        return NextResponse.json(
          { error: "Email is required for admin accounts" },
          { status: 400 }
        );
      }

      if (!body.pin) {
        return NextResponse.json(
          { error: "PIN is required for admin accounts" },
          { status: 400 }
        );
      }

      if (!canManageAdmins(authUser.role)) {
        return NextResponse.json(
          {
            error: "Forbidden: You don't have permission to create admins",
          },
          { status: 403 }
        );
      }

      // Check if user can modify this target role
      if (!canModifyRole(authUser.role, body.role)) {
        return NextResponse.json(
          {
            error: `Forbidden: You cannot create a ${body.role} admin`,
          },
          { status: 403 }
        );
      }

      const validation = validateCreateAdminDto({
        email: finalEmail,
        name: body.name,
        pin: body.pin,
        role: body.role,
      });
      if (!validation.valid) {
        return NextResponse.json(
          { error: "Validation failed", details: validation.errors },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: finalEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    // Create the user
    const user = await prisma.user.create({
      data: {
        email: finalEmail!,
        name: body.name,
        pin: body.pin!,
        role: body.role,
        restaurantId: authUser.restaurantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        pin: true,
        isActive: true,
        restaurantId: true,
        createdAt: true,
      },
    });

    // Log the action
    if (body.role === "WAITER") {
      await logWaiterCreated(authUser.userId, user.id, user.email, user.name);
    } else {
      await logAdminCreated(authUser.userId, user.id, user.email, user.name, body.role);
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
