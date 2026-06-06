import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@lib/auth/proxy";
import { canViewAuditLogs } from "@lib/admin/rbac";
import { getAdminAuditLogs, getAdminAuditLogsByTarget } from "@lib/admin/audit";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canViewAuditLogs(authUser.role)) {
      return NextResponse.json(
        { error: "Forbidden: You don't have permission to view audit logs" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const adminId = url.searchParams.get("adminId");
    const targetId = url.searchParams.get("targetId");

    let logs;
    let total;

    if (targetId) {
      // Get audit logs for a specific target user
      logs = await getAdminAuditLogsByTarget(targetId, limit, offset);
    } else if (adminId) {
      // Get audit logs by a specific admin
      logs = await getAdminAuditLogs(adminId, limit, offset);
    } else {
      // Get all audit logs
      logs = await getAdminAuditLogs(undefined, limit, offset);
    }

    return NextResponse.json({
      data: logs,
      pagination: {
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching admin audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
