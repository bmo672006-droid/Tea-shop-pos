// Waiter Management API Client

export interface WaiterWithSessions {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  waiterSessions: Array<{
    id: string;
    deviceId: string;
    deviceName?: string;
    deviceOS?: string;
    ipAddress?: string;
    lastSyncAt: string;
  }>;
}

export interface WaiterManagementStats {
  totalWaiters: number;
  activeWaiters: number;
  inactiveWaiters: number;
  totalActiveSessions: number;
  sessionsByDevice: number;
  waitersWithSessions: WaiterWithSessions[];
}

export interface WaiterSession {
  id: string;
  deviceId: string;
  deviceName?: string;
  deviceOS?: string;
  ipAddress?: string;
  isActive: boolean;
  lastSyncAt: string;
  createdAt: string;
  destroyedAt?: string;
}

export interface WaiterAccount {
  id: string;
  name: string;
  email: string;
  role?: string;
  pin?: string;
  isActive?: boolean;
}

export interface WaiterLoginSession {
  id: string;
  deviceId: string;
  createdAt?: string;
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

// Waiter PIN Management
export const waiterPinApi = {
  // Regenerate waiter PIN
  async regeneratePIN(
    waiterId: string,
    newPin?: string,
    token?: string
  ): Promise<{ success: boolean; waiter: WaiterAccount }> {
    return apiCall("POST", "/api/waiters/regenerate-pin", { waiterId, newPin }, token);
  },

  // Auto-generate PIN
  async generateAutoPIN(waiterId: string, token?: string): Promise<{ success: boolean; waiter: WaiterAccount }> {
    return this.regeneratePIN(waiterId, undefined, token);
  },
};

// Waiter Session Management
export const waiterSessionApi = {
  // Get waiter management dashboard stats
  async getDashboardStats(token?: string): Promise<WaiterManagementStats> {
    return apiCall("GET", "/api/waiters/sessions", undefined, token);
  },

  // Get sessions for specific waiter
  async getWaiterSessions(
    waiterId: string,
    includeInactive: boolean = false,
    token?: string
  ): Promise<{ waiterId: string; sessions: WaiterSession[] }> {
    const params = new URLSearchParams();
    params.append("waiterId", waiterId);
    if (includeInactive) params.append("includeInactive", "true");
    
    return apiCall("GET", `/api/waiters/sessions?${params.toString()}`, undefined, token);
  },

  // Delete specific session (logout device)
  async deleteSession(
    sessionId: string,
    token?: string
  ): Promise<{ success: boolean; message: string }> {
    return apiCall("DELETE", "/api/waiters/sessions", { sessionId }, token);
  },

  // Delete all sessions for a waiter
  async deleteAllSessions(
    waiterId: string,
    token?: string
  ): Promise<{ success: boolean; message: string; count: number }> {
    return apiCall(
      "DELETE",
      "/api/waiters/sessions",
      { waiterId, deleteAll: true },
      token
    );
  },
};

// Waiter Login (for mobile app - no token required)
export const waiterLoginApi = {
  // Mobile app login with PIN
  async loginWithPIN(
    pin: string,
    deviceId: string,
    deviceName?: string,
    deviceOS?: string
  ): Promise<{ success: boolean; waiter: WaiterAccount; session: WaiterLoginSession }> {
    return apiCall("POST", "/api/waiters/login", {
      pin,
      deviceId,
      deviceName,
      deviceOS,
    });
  },

  // Verify session is still active (called by mobile app periodically)
  async verifySession(
    sessionId: string,
    deviceId: string
  ): Promise<{ valid: boolean; shouldLogout: boolean }> {
    return apiCall("PUT", "/api/waiters/login", {
      sessionId,
      deviceId,
    });
  },
};

// Helper function to generate device ID (use on mobile app)
export function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random}`;
}
