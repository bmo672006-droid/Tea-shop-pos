import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { canManageWaiters } from "@lib/admin/rbac";
import {
  getWaiterActiveSessions,
  getWaiterAllSessions,
  deleteWaiterSession,
  deleteAllWaiterSessions,
  getWaiterManagementStats,
} from "@lib/waiter/session-management";
import { logWaiterUpdated } from "@lib/admin/audit";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageWaiters(authUser.role)) {
      return NextResponse.json(
        {
          error:
            "Forbidden: You don't have permission to view waiter sessions",
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const waiterId = url.searchParams.get("waiterId");
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    if (!waiterId) {
      // Return dashboard stats
      const stats = await getWaiterManagementStats();
      return NextResponse.json(stats);
    }

    // Get sessions for specific waiter
    const sessions = includeInactive
      ? await getWaiterAllSessions(waiterId)
      : await getWaiterActiveSessions(waiterId);

    return NextResponse.json({ waiterId, sessions });
  } catch (error) {
    console.error("Error fetching waiter sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch waiter sessions" },
      { status: 500 }
    );
  }
}

interface DeleteSessionRequest {
  sessionId?: string;
  waiterId?: string;
  deleteAll?: boolean; // Delete all sessions for a waiter
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageWaiters(authUser.role)) {
      return NextResponse.json(
        {
          error:
            "Forbidden: You don't have permission to delete waiter sessions",
        },
        { status: 403 }
      );
    }

    const body: DeleteSessionRequest = await request.json();

    if (body.deleteAll && body.waiterId) {
      // Delete all sessions for a waiter
      const count = await deleteAllWaiterSessions(body.waiterId);

      await logWaiterUpdated(authUser.userId, body.waiterId, {
        action: "deleted_all_sessions",
        count,
      });

      return NextResponse.json({
        success: true,
        message: `Deleted ${count} session(s)`,
        count,
      });
    } else if (body.sessionId) {
      // Delete specific session
      const session = await deleteWaiterSession(body.sessionId);

      await logWaiterUpdated(authUser.userId, session.waiterId, {
        action: "deleted_session",
        deviceId: session.deviceId,
      });

      return NextResponse.json({
        success: true,
        message: "Session deleted and device logged out",
        session: {
          id: session.id,
          deviceId: session.deviceId,
          waiterId: session.waiterId,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Either sessionId or (waiterId with deleteAll) is required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error deleting waiter session:", error);
    return NextResponse.json(
      { error: "Failed to delete waiter session" },
      { status: 500 }
    );
  }
}
