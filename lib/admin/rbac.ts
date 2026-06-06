import type { UserRole } from "@lib/auth/types";

export type AdminPermission =
  | "MANAGE_ADMINS"
  | "MANAGE_WAITERS"
  | "VIEW_AUDIT_LOGS"
  | "MANAGE_ORDERS"
  | "MANAGE_MENU"
  | "MANAGE_TABLES"
  | "PROCESS_PAYMENTS"
  | "VIEW_REPORTS";

const rolePermissions: Record<UserRole, AdminPermission[]> = {
  SUPER_ADMIN: [
    "MANAGE_ADMINS",
    "MANAGE_WAITERS",
    "VIEW_AUDIT_LOGS",
    "MANAGE_ORDERS",
    "MANAGE_MENU",
    "MANAGE_TABLES",
    "PROCESS_PAYMENTS",
    "VIEW_REPORTS",
  ],
  MANAGER: [
    "MANAGE_WAITERS",
    "VIEW_AUDIT_LOGS",
    "MANAGE_ORDERS",
    "MANAGE_MENU",
    "MANAGE_TABLES",
    "PROCESS_PAYMENTS",
    "VIEW_REPORTS",
  ],
  COUNTER: [
    "MANAGE_WAITERS",
    "MANAGE_ORDERS",
    "MANAGE_TABLES",
    "PROCESS_PAYMENTS",
  ],
  WAITER: ["MANAGE_ORDERS"],
};

export function hasPermission(role: UserRole, permission: AdminPermission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function canManageAdmins(role: UserRole): boolean {
  return hasPermission(role, "MANAGE_ADMINS");
}

export function canManageWaiters(role: UserRole): boolean {
  return hasPermission(role, "MANAGE_WAITERS");
}

export function canViewAuditLogs(role: UserRole): boolean {
  return hasPermission(role, "VIEW_AUDIT_LOGS");
}

export function canManageOrders(role: UserRole): boolean {
  return hasPermission(role, "MANAGE_ORDERS");
}

export function canManageMenu(role: UserRole): boolean {
  return hasPermission(role, "MANAGE_MENU");
}

export function canProcessPayments(role: UserRole): boolean {
  return hasPermission(role, "PROCESS_PAYMENTS");
}

export function canViewReports(role: UserRole): boolean {
  return hasPermission(role, "VIEW_REPORTS");
}

// Check if user can modify a target role
export function canModifyRole(actingRole: UserRole, targetRole: UserRole): boolean {
  if (actingRole === "SUPER_ADMIN") {
    return true;
  }

  if (actingRole === "MANAGER") {
    // MANAGER can manage MANAGER, COUNTER, and WAITER roles
    return targetRole !== "SUPER_ADMIN";
  }

  if (actingRole === "COUNTER") {
    // COUNTER can only manage WAITER role
    return targetRole === "WAITER";
  }

  return false;
}

export function getPermissionDescription(permission: AdminPermission): string {
  const descriptions: Record<AdminPermission, string> = {
    MANAGE_ADMINS: "Manage admin users",
    MANAGE_WAITERS: "Manage waiter users",
    VIEW_AUDIT_LOGS: "View audit logs",
    MANAGE_ORDERS: "Manage orders",
    MANAGE_MENU: "Manage menu items",
    MANAGE_TABLES: "Manage tables",
    PROCESS_PAYMENTS: "Process payments",
    VIEW_REPORTS: "View reports",
  };

  return descriptions[permission] || permission;
}

export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    SUPER_ADMIN: "Super Admin - Full access to all features",
    MANAGER: "Manager - Can manage all users except Super Admin, and all features except admin management",
    COUNTER: "Counter - Can manage orders, tables, payments, and waiters only",
    WAITER: "Waiter - Can manage orders only",
  };

  return descriptions[role] || role;
}
