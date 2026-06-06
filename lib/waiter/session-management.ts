import prisma from "@lib/prisma";
import type { Prisma, WaiterSession } from "@/app/generated/prisma/client";

export interface WaiterSessionData {
  waiterId: string;
  deviceId: string;
  pin: string;
  deviceName?: string;
  deviceOS?: string;
  ipAddress?: string;
  userAgent?: string;
}

type WaiterLoginSession = Prisma.WaiterSessionGetPayload<{
  include: {
    waiter: {
      select: {
        id: true;
        name: true;
        email: true;
        role: true;
      };
    };
  };
}>;

type DeletedWaiterSession = Prisma.WaiterSessionGetPayload<{
  include: {
    waiter: {
      select: {
        id: true;
        name: true;
        email: true;
      };
    };
  };
}>;

export class WaiterPinInUseError extends Error {
  constructor() {
    super("This PIN is already active on another mobile device");
    this.name = "WaiterPinInUseError";
  }
}

/**
 * Create or update a waiter session (device login)
 */
export async function createOrUpdateWaiterSession(
  data: WaiterSessionData
): Promise<WaiterLoginSession> {
  const existingSessionOnAnotherDevice = await prisma.waiterSession.findFirst({
    where: {
      waiterId: data.waiterId,
      pin: data.pin,
      isActive: true,
      destroyedAt: null,
      deviceId: { not: data.deviceId },
    },
  });

  if (existingSessionOnAnotherDevice) {
    throw new WaiterPinInUseError();
  }

  await prisma.waiterSession.updateMany({
    where: {
      deviceId: data.deviceId,
      isActive: true,
      destroyedAt: null,
      waiterId: { not: data.waiterId },
    },
    data: {
      isActive: false,
      destroyedAt: new Date(),
    },
  });

  // Create or update session for this device
  const session = await prisma.waiterSession.upsert({
    where: {
      waiterId_deviceId: {
        waiterId: data.waiterId,
        deviceId: data.deviceId,
      },
    },
    update: {
      pin: data.pin,
      isActive: true,
      lastSyncAt: new Date(),
      deviceName: data.deviceName,
      deviceOS: data.deviceOS,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      destroyedAt: null, // Clear destroyed flag if re-login
    },
    create: {
      waiterId: data.waiterId,
      deviceId: data.deviceId,
      pin: data.pin,
      isActive: true,
      deviceName: data.deviceName,
      deviceOS: data.deviceOS,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
    include: {
      waiter: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return session;
}

/**
 * Get active sessions for a waiter
 */
export async function getWaiterActiveSessions(waiterId: string) {
  return prisma.waiterSession.findMany({
    where: {
      waiterId,
      isActive: true,
      destroyedAt: null,
    },
    select: {
      id: true,
      deviceId: true,
      deviceName: true,
      deviceOS: true,
      ipAddress: true,
      lastSyncAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get all sessions for a waiter (including inactive)
 */
export async function getWaiterAllSessions(waiterId: string) {
  return prisma.waiterSession.findMany({
    where: { waiterId },
    select: {
      id: true,
      deviceId: true,
      deviceName: true,
      deviceOS: true,
      ipAddress: true,
      isActive: true,
      lastSyncAt: true,
      createdAt: true,
      destroyedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Delete a waiter session (logout device remotely from admin)
 */
export async function deleteWaiterSession(sessionId: string): Promise<DeletedWaiterSession> {
  const session = await prisma.waiterSession.update({
    where: { id: sessionId },
    data: {
      isActive: false,
      destroyedAt: new Date(),
    },
    include: {
      waiter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return session;
}

/**
 * Delete all sessions for a waiter
 */
export async function deleteAllWaiterSessions(waiterId: string): Promise<number> {
  const result = await prisma.waiterSession.updateMany({
    where: {
      waiterId,
      isActive: true,
    },
    data: {
      isActive: false,
      destroyedAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Get waiter session by PIN and device ID
 */
export async function getWaiterSessionByPinAndDevice(
  pin: string,
  deviceId: string
): Promise<WaiterLoginSession | null> {
  return prisma.waiterSession.findFirst({
    where: {
      pin,
      deviceId,
      isActive: true,
      destroyedAt: null,
    },
    include: {
      waiter: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Update session last sync time (device heartbeat)
 */
export async function updateSessionLastSync(sessionId: string): Promise<WaiterSession> {
  return prisma.waiterSession.update({
    where: { id: sessionId },
    data: { lastSyncAt: new Date() },
  });
}

/**
 * Check if session is still active and not destroyed
 */
export async function isSessionValid(sessionId: string): Promise<boolean> {
  const session = await prisma.waiterSession.findUnique({
    where: { id: sessionId },
  });

  return session ? session.isActive && !session.destroyedAt : false;
}

/**
 * Get dashboard stats for waiter management
 */
export async function getWaiterManagementStats() {
  const totalWaiters = await prisma.user.count({
    where: { role: "WAITER" },
  });

  const activeWaiters = await prisma.user.count({
    where: { role: "WAITER", isActive: true },
  });

  const totalActiveSessions = await prisma.waiterSession.count({
    where: { isActive: true, destroyedAt: null },
  });

  const sessionsByDevice = await prisma.waiterSession.groupBy({
    by: ["waiterId"],
    where: { isActive: true, destroyedAt: null },
    _count: true,
  });

  // Get detailed waiter info with their active sessions
  const waitersWithSessions = await prisma.user.findMany({
    where: { role: "WAITER" },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      waiterSessions: {
        where: { isActive: true, destroyedAt: null },
        select: {
          id: true,
          deviceId: true,
          deviceName: true,
          deviceOS: true,
          ipAddress: true,
          lastSyncAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    totalWaiters,
    activeWaiters,
    inactiveWaiters: totalWaiters - activeWaiters,
    totalActiveSessions,
    sessionsByDevice: sessionsByDevice.length,
    waitersWithSessions,
  };
}
