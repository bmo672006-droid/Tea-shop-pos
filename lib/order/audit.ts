import prisma from "../prisma";

export type AuditAction = 
  | "CREATE_ORDER"
  | "MODIFY_ORDER"
  | "DELIVER_ITEM"
  | "PAYMENT_INIT"
  | "PAYMENT_CONFIRM";

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  orderId?: string;
  details?: Record<string, unknown>;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        orderId: entry.orderId,
        details: JSON.stringify(entry.details || {}),
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export function formatAuditDetails(
  action: AuditAction,
  data: Record<string, unknown>
): string {
  return JSON.stringify({
    action,
    data,
    timestamp: new Date().toISOString(),
  });
}

export async function logOrderCreated(
  userId: string,
  orderId: string,
  tableId: string | null | undefined,
  itemCount: number,
  totalAmount: number
): Promise<void> {
  await createAuditLog({
    userId,
    action: "CREATE_ORDER",
    orderId,
    details: {
      tableId,
      itemCount,
      totalAmount,
    },
  });
}

export async function logOrderModified(
  userId: string,
  orderId: string,
  changes: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    userId,
    action: "MODIFY_ORDER",
    orderId,
    details: changes,
  });
}

export async function logItemDelivered(
  userId: string,
  orderId: string,
  itemId: string,
  menuItemName: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: "DELIVER_ITEM",
    orderId,
    details: {
      itemId,
      menuItemName,
      deliveredBy: userId,
    },
  });
}

export async function logPaymentInitiated(
  userId: string,
  orderId: string,
  paymentId: string,
  amount: number
): Promise<void> {
  await createAuditLog({
    userId,
    action: "PAYMENT_INIT",
    orderId,
    details: {
      paymentId,
      amount,
    },
  });
}

export async function logPaymentConfirmed(
  userId: string,
  orderId: string,
  paymentId: string,
  amount: number
): Promise<void> {
  await createAuditLog({
    userId,
    action: "PAYMENT_CONFIRM",
    orderId,
    details: {
      paymentId,
      amount,
      confirmedBy: userId,
    },
  });
}