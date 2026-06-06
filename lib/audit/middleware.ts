import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, type AuthenticatedUser } from "@lib/auth/proxy";
import { createAuditLog, type AuditAction } from "@lib/order/audit";
import prisma from "@lib/prisma";

export interface AuditTrailOptions {
  actions: AuditAction[];
  logDetails?: (req: NextRequest, before: unknown, after: unknown) => Record<string, unknown>;
}

export function withAuditTrail(
  handler: (req: NextRequest, authUser: AuthenticatedUser) => Promise<NextResponse>,
  options: AuditTrailOptions
) {
  return async function (req: NextRequest): Promise<NextResponse> {
    const authUser = await getAuthenticatedUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orderId = extractOrderIdFromRequest(req);
    
    let beforeState: unknown = null;
    if (orderId) {
      beforeState = await getOrderState(orderId);
    }

    const response = await handler(req, authUser);

    if (response.status >= 200 && response.status < 300 && orderId) {
      const afterState = await getOrderState(orderId);
      
      const details = options.logDetails 
        ? options.logDetails(req, beforeState, afterState)
        : { changes: computeDiff(beforeState, afterState) };

      await Promise.all(
        options.actions.map((action) =>
          createAuditLog({
            userId: authUser.userId,
            action,
            orderId,
            details,
          })
        )
      );
    }

    return response;
  };
}

function extractOrderIdFromRequest(req: NextRequest): string | null {
  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  
  const orderIndex = pathParts.indexOf("orders");
  if (orderIndex !== -1 && pathParts.length > orderIndex + 1) {
    return pathParts[orderIndex + 1];
  }
  
  return null;
}

async function getOrderState(orderId: string): Promise<unknown> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
      },
    });
    
    return order 
      ? {
          status: order.status,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          items: order.items.map((item) => ({
            id: item.id,
            status: item.status,
            quantity: item.quantity,
            price: item.price,
          })),
        }
      : null;
  } catch {
    return null;
  }
}

function computeDiff(before: unknown, after: unknown): Record<string, unknown> {
  if (!before || !after) {
    return {};
  }

  const changes: Record<string, unknown> = {};
  
  for (const key in after) {
    if (JSON.stringify((before as Record<string, unknown>)[key]) !== JSON.stringify((after as Record<string, unknown>)[key])) {
      changes[key] = {
        from: (before as Record<string, unknown>)[key],
        to: (after as Record<string, unknown>)[key],
      };
    }
  }
  
  return changes;
}