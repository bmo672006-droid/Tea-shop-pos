// React hooks for admin management operations
// Usage: import { useAdminUsers, useAuditLogs } from '@lib/admin/hooks';

"use client";

import { useState, useCallback, useEffect } from "react";
import { userApi, auditApi, adminApi } from "@lib/admin/client";
import type { User, AdminAuditLog, AdminStats, CreateUserRequest, UpdateUserRequest } from "@lib/admin/client";
import type { UserRole } from "@lib/auth/types";

export interface UseAdminUsersResult {
  users: User[];
  loading: boolean;
  error: string | null;
  refreshUsers: (role?: string) => Promise<void>;
  createUser: (data: CreateUserRequest) => Promise<User>;
  updateUser: (userId: string, data: UpdateUserRequest) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  activateUser: (userId: string) => Promise<void>;
}

export function useAdminUsers(token?: string): UseAdminUsersResult {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUsers = useCallback(
    async (role?: string) => {
      try {
        setLoading(true);
        setError(null);
        const data = await userApi.listUsers(role as UserRole | undefined, token);
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const createUser = useCallback(
    async (data: CreateUserRequest): Promise<User> => {
      try {
        setError(null);
        const newUser = await userApi.createUser(data, token);
        setUsers((prev) => [...prev, newUser]);
        return newUser;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create user";
        setError(message);
        throw err;
      }
    },
    [token]
  );

  const updateUser = useCallback(
    async (userId: string, data: UpdateUserRequest): Promise<User> => {
      try {
        setError(null);
        const updated = await userApi.updateUser(userId, data, token);
        setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update user";
        setError(message);
        throw err;
      }
    },
    [token]
  );

  const deleteUser = useCallback(
    async (userId: string): Promise<void> => {
      try {
        setError(null);
        await userApi.deleteUser(userId, token);
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete user";
        setError(message);
        throw err;
      }
    },
    [token]
  );

  const deactivateUser = useCallback(
    async (userId: string): Promise<void> => {
      await updateUser(userId, { isActive: false });
    },
    [updateUser]
  );

  const activateUser = useCallback(
    async (userId: string): Promise<void> => {
      await updateUser(userId, { isActive: true });
    },
    [updateUser]
  );

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  return {
    users,
    loading,
    error,
    refreshUsers,
    createUser,
    updateUser,
    deleteUser,
    deactivateUser,
    activateUser,
  };
}

export interface UseAuditLogsResult {
  logs: AdminAuditLog[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuditLogs(
  options?: {
    adminId?: string;
    targetId?: string;
    limit?: number;
    token?: string;
  },
  autoLoad = true
): UseAuditLogsResult {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const limit = options?.limit || 50;

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setOffset(0);
      const result = await auditApi.getAuditLogs({
        ...options,
        limit,
        offset: 0,
      });
      setLogs(result.data);
      setHasMore(result.data.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [options, limit]);

  const loadMore = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const nextOffset = offset + limit;
      const result = await auditApi.getAuditLogs({
        ...options,
        limit,
        offset: nextOffset,
      });
      setLogs((prev) => [...prev, ...result.data]);
      setOffset(nextOffset);
      setHasMore(result.data.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more logs");
    } finally {
      setLoading(false);
    }
  }, [options, offset, limit]);

  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, []);

  return {
    logs,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

export interface UseAdminStatsResult {
  stats: AdminStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAdminStats(token?: string, autoLoad = true): UseAdminStatsResult {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getStats(token);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, []);

  return {
    stats,
    loading,
    error,
    refresh,
  };
}

// Utility hook for permission checking
export function useAdminPermissions(userRole?: string) {
  const canManageAdmins = userRole === "SUPER_ADMIN" || userRole === "MANAGER";
  const canManageWaiters = ["SUPER_ADMIN", "MANAGER", "COUNTER"].includes(userRole || "");
  const canViewAuditLogs = ["SUPER_ADMIN", "MANAGER"].includes(userRole || "");

  return {
    canManageAdmins,
    canManageWaiters,
    canViewAuditLogs,
    canManageOrders: userRole !== undefined,
    isAdmin: canManageAdmins || canManageWaiters,
  };
}

/*
// Example usage in a React component:

import { useAdminUsers, useAuditLogs, useAdminStats, useAdminPermissions } from '@lib/admin/hooks';
import { useSession } from 'next-auth/react';

export function AdminManagementPage() {
  const { data: session } = useSession();
  const { users, loading, createUser, deleteUser } = useAdminUsers(session?.user?.token);
  const { stats, refresh: refreshStats } = useAdminStats(session?.user?.token);
  const { logs, refresh: refreshLogs } = useAuditLogs(undefined, session?.user?.token);
  const { canManageAdmins } = useAdminPermissions(session?.user?.role);

  if (!canManageAdmins) {
    return <div>You don't have permission to access this page</div>;
  }

  return (
    <div>
      <h1>Admin Management</h1>
      
      {stats && (
        <div>
          <h2>Statistics</h2>
          <p>Total Admins: {stats.admins.reduce((sum, a) => sum + a.count, 0)}</p>
          <p>Total Waiters: {stats.waiters.total}</p>
        </div>
      )}

      <h2>Users</h2>
      {loading ? <p>Loading...</p> : (
        <div>
          {users.map(user => (
            <div key={user.id}>
              <p>{user.name} ({user.role})</p>
              <button onClick={() => deleteUser(user.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      <h2>Recent Audit Logs</h2>
      {logs.map(log => (
        <div key={log.id}>
          <p>{log.admin.name} - {log.action}</p>
          <p>{log.details}</p>
        </div>
      ))}
    </div>
  );
}
*/
