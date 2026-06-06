// Admin Management API Client Service
// This file provides helper functions for interacting with the admin management API

import type { UserRole } from "@lib/auth/types";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  restaurantId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  targetRole?: string;
  changes: string;
  details?: string;
  timestamp: string;
  admin: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface AdminStats {
  admins: Array<{
    role: UserRole;
    count: number;
    description: string;
  }>;
  waiters: {
    total: number;
    active: number;
    inactive: number;
  };
  recentAuditLogs: AdminAuditLog[];
}

export interface CreateUserRequest {
  email: string;
  name: string;
  pin: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  pin?: string;
  role?: UserRole;
  isActive?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

async function apiCall<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `API error: ${response.status}`);
  }

  return response.json();
}

// User Management
export const userApi = {
  // List users with optional role filter
  async listUsers(role?: UserRole, token?: string): Promise<User[]> {
    const params = new URLSearchParams();
    if (role) params.append("role", role);
    return apiCall("GET", `/api/users?${params.toString()}`, undefined, token);
  },

  // Get single user
  async getUser(userId: string, token?: string): Promise<User> {
    return apiCall("GET", `/api/users/${userId}`, undefined, token);
  },

  // Create new user (admin or waiter)
  async createUser(data: CreateUserRequest, token?: string): Promise<User> {
    return apiCall("POST", "/api/users", data, token);
  },

  // Update user
  async updateUser(userId: string, data: UpdateUserRequest, token?: string): Promise<User> {
    return apiCall("PUT", `/api/users/${userId}`, data, token);
  },

  // Delete user
  async deleteUser(userId: string, token?: string): Promise<{ success: boolean }> {
    return apiCall("DELETE", `/api/users/${userId}`, undefined, token);
  },

  // Deactivate user
  async deactivateUser(userId: string, token?: string): Promise<User> {
    return this.updateUser(userId, { isActive: false }, token);
  },

  // Activate user
  async activateUser(userId: string, token?: string): Promise<User> {
    return this.updateUser(userId, { isActive: true }, token);
  },

  // List admins only
  async listAdmins(token?: string): Promise<User[]> {
    return this.listUsers("SUPER_ADMIN", token).then((users) => users);
    // Note: This will return only one type, you may want to fetch and filter multiple roles
  },

  // List waiters only
  async listWaiters(token?: string): Promise<User[]> {
    return this.listUsers("WAITER", token);
  },
};

// Audit Logs
export const auditApi = {
  // Get admin audit logs
  async getAuditLogs(options?: {
    adminId?: string;
    targetId?: string;
    limit?: number;
    offset?: number;
    token?: string;
  }): Promise<{ data: AdminAuditLog[]; pagination: { limit: number; offset: number } }> {
    const params = new URLSearchParams();
    if (options?.adminId) params.append("adminId", options.adminId);
    if (options?.targetId) params.append("targetId", options.targetId);
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());

    return apiCall(
      "GET",
      `/api/admin/audit-logs?${params.toString()}`,
      undefined,
      options?.token
    );
  },

  // Get audit logs for specific user
  async getUserAuditLogs(
    userId: string,
    limit: number = 50,
    token?: string
  ): Promise<{ data: AdminAuditLog[]; pagination: { limit: number; offset: number } }> {
    return this.getAuditLogs({ targetId: userId, limit, token });
  },

  // Get audit logs by admin
  async getAdminActionLogs(
    adminId: string,
    limit: number = 50,
    token?: string
  ): Promise<{ data: AdminAuditLog[]; pagination: { limit: number; offset: number } }> {
    return this.getAuditLogs({ adminId, limit, token });
  },
};

// Admin Management
export const adminApi = {
  // Get admin management statistics
  async getStats(token?: string): Promise<AdminStats> {
    return apiCall("GET", "/api/admin/stats", undefined, token);
  },

  // Get current user permissions
  async getCurrentPermissions(token?: string): Promise<{
    role: UserRole;
    permissions: string[];
  }> {
    // This would need to be implemented in your auth context/service
    throw new Error("Use your auth context to get current user permissions");
  },
};

// Usage Examples are in @lib/admin/hooks.ts
