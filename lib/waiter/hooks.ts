// React hooks for waiter management
"use client";

import { useState, useCallback, useEffect } from "react";
import { 
  waiterPinApi, 
  waiterSessionApi,
  waiterLoginApi,
  WaiterManagementStats,
  WaiterAccount,
  WaiterSession 
} from "@lib/waiter/client";

export interface UseWaiterManagementResult {
  stats: WaiterManagementStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  regeneratePIN: (waiterId: string, newPin?: string) => Promise<{ success: boolean; waiter: WaiterAccount }>;
  deleteSession: (sessionId: string) => Promise<void>;
  deleteAllSessions: (waiterId: string) => Promise<void>;
}

export function useWaiterManagement(token?: string): UseWaiterManagementResult {
  const [stats, setStats] = useState<WaiterManagementStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await waiterSessionApi.getDashboardStats(token);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const regeneratePIN = useCallback(
    async (waiterId: string, newPin?: string): Promise<{ success: boolean; waiter: WaiterAccount }> => {
      try {
        setError(null);
        const result = await waiterPinApi.regeneratePIN(waiterId, newPin, token);
        await refresh(); // Refresh stats
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to regenerate PIN";
        setError(message);
        throw err;
      }
    },
    [token, refresh]
  );

  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      try {
        setError(null);
        await waiterSessionApi.deleteSession(sessionId, token);
        await refresh(); // Refresh stats
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete session";
        setError(message);
        throw err;
      }
    },
    [token, refresh]
  );

  const deleteAllSessions = useCallback(
    async (waiterId: string): Promise<void> => {
      try {
        setError(null);
        await waiterSessionApi.deleteAllSessions(waiterId, token);
        await refresh(); // Refresh stats
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete all sessions";
        setError(message);
        throw err;
      }
    },
    [token, refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    stats,
    loading,
    error,
    refresh,
    regeneratePIN,
    deleteSession,
    deleteAllSessions,
  };
}

export interface UseWaiterSessionsResult {
  sessions: WaiterSession[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  deleteAll: () => Promise<void>;
}

export function useWaiterSessions(
  waiterId: string,
  token?: string,
  autoLoad = true
): UseWaiterSessionsResult {
  const [sessions, setSessions] = useState<WaiterSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await waiterSessionApi.getWaiterSessions(waiterId, false, token);
      setSessions(result.sessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [waiterId, token]);

  const deleteSession = useCallback(
    async (sessionId: string): Promise<void> => {
      try {
        setError(null);
        await waiterSessionApi.deleteSession(sessionId, token);
        await refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to delete session";
        setError(message);
        throw err;
      }
    },
    [token, refresh]
  );

  const deleteAll = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      await waiterSessionApi.deleteAllSessions(waiterId, token);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete all sessions";
      setError(message);
      throw err;
    }
  }, [waiterId, token, refresh]);

  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [refresh, autoLoad]);

  return {
    sessions,
    loading,
    error,
    refresh,
    deleteSession,
    deleteAll,
  };
}

// Hook for periodic session verification (use in mobile app)
export function useSessionVerification(
  sessionId: string | null,
  deviceId: string | null,
  interval: number = 30000 // Check every 30 seconds
): { isValid: boolean; shouldLogout: boolean; checking: boolean } {
  const [isValid, setIsValid] = useState(true);
  const [shouldLogout, setShouldLogout] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!sessionId || !deviceId) return;

    const verifySession = async () => {
      try {
        setChecking(true);
        const result = await waiterLoginApi.verifySession(sessionId, deviceId);
        setIsValid(result.valid);
        setShouldLogout(result.shouldLogout);
      } catch (err) {
        console.error("Session verification failed:", err);
        setShouldLogout(true);
      } finally {
        setChecking(false);
      }
    };

    // Verify immediately
    verifySession();

    // Then verify periodically
    const intervalId = setInterval(verifySession, interval);

    return () => clearInterval(intervalId);
  }, [sessionId, deviceId, interval]);

  return { isValid, shouldLogout, checking };
}
