import prisma from "@lib/prisma";

export type AdminAction =
  | "CREATE_ADMIN"
  | "UPDATE_ADMIN"
  | "DELETE_ADMIN"
  | "DEACTIVATE_ADMIN"
  | "ACTIVATE_ADMIN"
  | "CREATE_WAITER"
  | "UPDATE_WAITER"
  | "DELETE_WAITER"
  | "DEACTIVATE_WAITER"
  | "ACTIVATE_WAITER";

export interface AdminAuditEntry {
  adminId: string;
  action: AdminAction;
  targetId?: string;
  targetRole?: string;
  changes?: Record<string, unknown>;
  details?: string;
}

export async function logAdminAction(entry: AdminAuditEntry): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: entry.adminId,
        action: entry.action,
        targetId: entry.targetId,
        targetRole: entry.targetRole,
        changes: JSON.stringify(entry.changes || {}),
        details: entry.details,
      },
    });
  } catch (error) {
    console.error("Failed to create admin audit log:", error);
  }
}

export async function logAdminCreated(
  adminId: string,
  newAdminId: string,
  email: string,
  name: string,
  role: string
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "CREATE_ADMIN",
    targetId: newAdminId,
    targetRole: role,
    changes: {
      email,
      name,
      role,
    },
    details: `Created new admin: ${name} (${email}) with role ${role}`,
  });
}

export async function logAdminUpdated(
  adminId: string,
  targetId: string,
  targetRole: string,
  changes: Record<string, unknown>
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "UPDATE_ADMIN",
    targetId,
    targetRole,
    changes,
    details: `Updated admin ${targetId}`,
  });
}

export async function logAdminDeleted(
  adminId: string,
  deletedAdminId: string,
  deletedAdminEmail: string,
  deletedAdminRole: string
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "DELETE_ADMIN",
    targetId: deletedAdminId,
    targetRole: deletedAdminRole,
    changes: {
      status: "deleted",
    },
    details: `Deleted admin: ${deletedAdminEmail}`,
  });
}

export async function logAdminDeactivated(
  adminId: string,
  targetId: string,
  targetEmail: string,
  targetRole: string
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "DEACTIVATE_ADMIN",
    targetId,
    targetRole,
    changes: {
      isActive: false,
    },
    details: `Deactivated admin: ${targetEmail}`,
  });
}

export async function logAdminActivated(
  adminId: string,
  targetId: string,
  targetEmail: string,
  targetRole: string
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "ACTIVATE_ADMIN",
    targetId,
    targetRole,
    changes: {
      isActive: true,
    },
    details: `Activated admin: ${targetEmail}`,
  });
}

export async function logWaiterCreated(
  adminId: string,
  waiterId: string,
  email: string,
  name: string
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "CREATE_WAITER",
    targetId: waiterId,
    targetRole: "WAITER",
    changes: {
      email,
      name,
      role: "WAITER",
    },
    details: `Created new waiter: ${name} (${email})`,
  });
}

export async function logWaiterUpdated(
  adminId: string,
  waiterId: string,
  changes: Record<string, unknown>
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "UPDATE_WAITER",
    targetId: waiterId,
    targetRole: "WAITER",
    changes,
    details: `Updated waiter ${waiterId}`,
  });
}

export async function logWaiterDeleted(
  adminId: string,
  waiterId: string,
  waiterEmail: string
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "DELETE_WAITER",
    targetId: waiterId,
    targetRole: "WAITER",
    changes: {
      status: "deleted",
    },
    details: `Deleted waiter: ${waiterEmail}`,
  });
}

export async function logWaiterDeactivated(
  adminId: string,
  waiterId: string,
  waiterEmail: string
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "DEACTIVATE_WAITER",
    targetId: waiterId,
    targetRole: "WAITER",
    changes: {
      isActive: false,
    },
    details: `Deactivated waiter: ${waiterEmail}`,
  });
}

export async function logWaiterActivated(
  adminId: string,
  waiterId: string,
  waiterEmail: string
): Promise<void> {
  await logAdminAction({
    adminId,
    action: "ACTIVATE_WAITER",
    targetId: waiterId,
    targetRole: "WAITER",
    changes: {
      isActive: true,
    },
    details: `Activated waiter: ${waiterEmail}`,
  });
}

export async function getAdminAuditLogs(
  adminId?: string,
  limit: number = 100,
  offset: number = 0
) {
  return prisma.adminAuditLog.findMany({
    where: adminId ? { adminId } : {},
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      timestamp: "desc",
    },
    take: limit,
    skip: offset,
  });
}

export async function getAdminAuditLogsByTarget(
  targetId: string,
  limit: number = 100,
  offset: number = 0
) {
  return prisma.adminAuditLog.findMany({
    where: { targetId },
    include: {
      admin: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: {
      timestamp: "desc",
    },
    take: limit,
    skip: offset,
  });
}
