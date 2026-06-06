import { jwtVerify, SignJWT } from "jose";
import type { AuthPayload } from "./types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-super-secret-key-change-in-production"
);

const ALGORITHM = "HS256";

export async function createToken(payload: Omit<AuthPayload, "restaurantId"> & { restaurantId: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.restaurantId !== "string"
    ) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as "SUPER_ADMIN" | "MANAGER" | "COUNTER" | "WAITER",
      restaurantId: payload.restaurantId,
    };
  } catch {
    return null;
  }
}

export function getSocketToken(user: { id: string; email: string; role: string; restaurantId: string }): Promise<string> {
  return createToken({
    userId: user.id,
    email: user.email,
    role: user.role as "SUPER_ADMIN" | "MANAGER" | "COUNTER" | "WAITER",
    restaurantId: user.restaurantId,
  });
}