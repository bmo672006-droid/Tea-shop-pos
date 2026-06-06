import prisma from "@lib/prisma";

/**
 * Generate a random 4-digit PIN
 */
export function generateRandomPIN(): string {
  const pin = Math.floor(1000 + Math.random() * 8999).toString(); // 1000-9999
  return pin;
}

/**
 * Generate a unique PIN for a waiter (ensures no other waiter has this PIN)
 */
export async function generateUniquePIN(waiterId?: string): Promise<string> {
  let pin: string = "";
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    pin = generateRandomPIN();

    // Check if PIN exists
    const existing = await prisma.user.findUnique({
      where: { pin },
    });

    if (!existing || existing.id === waiterId) {
      isUnique = true;
      break;
    }

    attempts++;
  }

  if (!isUnique) {
    throw new Error("Failed to generate unique PIN after multiple attempts");
  }

  return pin;
}

/**
 * Validate PIN format (4 digits)
 */
export function validatePINFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin) {
    return { valid: false, error: "PIN is required" };
  }

  if (pin.length !== 4) {
    return { valid: false, error: "PIN must be exactly 4 digits" };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { valid: false, error: "PIN must contain only digits" };
  }

  return { valid: true };
}

/**
 * Check if a PIN is already in use by another waiter
 */
export async function isPINInUse(pin: string, excludeWaiterId?: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { pin },
  });

  if (!user) {
    return false;
  }

  // If excluding a specific waiter, allow if it's the same waiter
  if (excludeWaiterId && user.id === excludeWaiterId) {
    return false;
  }

  return true;
}
