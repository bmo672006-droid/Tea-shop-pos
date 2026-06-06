import { NextRequest, NextResponse } from "next/server";
import prisma from "@lib/prisma";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { canManageAdmins, canManageWaiters, canModifyRole } from "@lib/admin/rbac";
import { validateUpdateAdminDto } from "@lib/admin/validation";
import {
  logAdminUpdated,
  logAdminDeactivated,
  logAdminActivated,
  logAdminDeleted,
  logWaiterUpdated,
  logWaiterDeactivated,
  logWaiterActivated,
  logWaiterDeleted,
} from "@lib/admin/audit";
import type { UserRole } from "@lib/auth/types";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        restaurantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // RBAC for viewing a specific user
    if (authUser.role === "WAITER" && authUser.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Waiters can only view their own profile" },
        { status: 403 }
      );
    }

    const isTargetAdmin = ["SUPER_ADMIN", "MANAGER", "COUNTER"].includes(targetUser.role);

    if (isTargetAdmin && !canManageAdmins(authUser.role)) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to view this admin" },
        { status: 403 }
      );
    }

    if (targetUser.role === "WAITER" && !canManageWaiters(authUser.role)) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to view this waiter" },
        { status: 403 }
      );
    }

    return NextResponse.json(targetUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

interface UpdateUserBody {
  name?: string;
  email?: string;
  pin?: string;
  role?: UserRole;
  isActive?: boolean;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;
    const body: UpdateUserBody = await request.json();

    // Prevent self-deletion
    if (userId === authUser.userId && body.isActive === false) {
      return NextResponse.json(
        { error: "Cannot deactivate yourself" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isTargetAdmin = ["SUPER_ADMIN", "MANAGER", "COUNTER"].includes(targetUser.role);
    const isTargetWaiter = targetUser.role === "WAITER";

    // RBAC for updating
    if (isTargetAdmin) {
      if (!canManageAdmins(authUser.role)) {
        return NextResponse.json(
          { error: "Forbidden: You don't have permission to update admins" },
          { status: 403 }
        );
      }

      if (!canModifyRole(authUser.role as UserRole, targetUser.role as UserRole)) {
        return NextResponse.json(
          {
            error: `Forbidden: You cannot modify a ${targetUser.role} admin`,
          },
          { status: 403 }
        );
      }
    } else if (isTargetWaiter) {
      if (!canManageWaiters(authUser.role)) {
        return NextResponse.json(
          { error: "Forbidden: You don't have permission to update waiters" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid user role" },
        { status: 400 }
      );
    }

    // Validate input
    const validation = validateUpdateAdminDto(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    // If changing role, check permissions
    if (body.role && body.role !== targetUser.role) {
      if (!canModifyRole(authUser.role, body.role)) {
        return NextResponse.json(
          {
            error: `Forbidden: You cannot change role to ${body.role}`,
          },
          { status: 403 }
        );
      }
    }

    // Track what changed
    const changes: Record<string, string | boolean> = {};
    if (body.name && body.name !== targetUser.name) changes.name = body.name;
    if (body.email && body.email !== targetUser.email) changes.email = body.email;
    if (body.pin) changes.pin = "***"; // Don't log actual PIN
    if (body.role && body.role !== targetUser.role) changes.role = body.role;
    if (typeof body.isActive === "boolean" && body.isActive !== targetUser.isActive) {
      changes.isActive = body.isActive;
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.email && { email: body.email.toLowerCase() }),
        ...(body.pin && { pin: body.pin }),
        ...(body.role && { role: body.role }),
        ...(typeof body.isActive === "boolean" && { isActive: body.isActive }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    // Log the changes
    if (isTargetAdmin) {
      if (typeof body.isActive === "boolean" && body.isActive !== targetUser.isActive) {
        if (body.isActive) {
          await logAdminActivated(authUser.userId, userId, targetUser.email, targetUser.role);
        } else {
          await logAdminDeactivated(authUser.userId, userId, targetUser.email, targetUser.role);
        }
      } else {
        await logAdminUpdated(authUser.userId, userId, targetUser.role, changes);
      }
    } else if (isTargetWaiter) {
      if (typeof body.isActive === "boolean" && body.isActive !== targetUser.isActive) {
        if (body.isActive) {
          await logWaiterActivated(authUser.userId, userId, targetUser.email);
        } else {
          await logWaiterDeactivated(authUser.userId, userId, targetUser.email);
        }
      } else {
        await logWaiterUpdated(authUser.userId, userId, changes);
      }
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    if (userId === authUser.userId) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isTargetAdmin = ["SUPER_ADMIN", "MANAGER", "COUNTER"].includes(targetUser.role);
    const isTargetWaiter = targetUser.role === "WAITER";

    // RBAC for deleting
    if (isTargetAdmin) {
      if (!canManageAdmins(authUser.role)) {
        return NextResponse.json(
          { error: "Forbidden: You don't have permission to delete admins" },
          { status: 403 }
        );
      }

      if (!canModifyRole(authUser.role as UserRole, targetUser.role as UserRole)) {
        return NextResponse.json(
          {
            error: `Forbidden: You cannot delete a ${targetUser.role} admin`,
          },
          { status: 403 }
        );
      }
    } else if (isTargetWaiter) {
      if (!canManageWaiters(authUser.role)) {
        return NextResponse.json(
          { error: "Forbidden: You don't have permission to delete waiters" },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid user role" },
        { status: 400 }
      );
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId },
    });

    // Log the deletion
    if (isTargetAdmin) {
      await logAdminDeleted(authUser.userId, userId, targetUser.email, targetUser.role);
    } else if (isTargetWaiter) {
      await logWaiterDeleted(authUser.userId, userId, targetUser.email);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
