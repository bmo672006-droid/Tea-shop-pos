import { SignJWT, jwtVerify } from "jose";
import type { TokenPayload, UserRole } from "./types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "pos-app-secret-key-change-in-production"
);

const ALGORITHM = "HS256";
const TOKEN_EXPIRY_SECONDS = 8 * 60 * 60;

export async function createToken(payload: {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  restaurantId: string;
  waiterSessionId?: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_SECONDS * 1000);
  const claims: Record<string, string> = {
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    restaurantId: payload.restaurantId,
  };

  if (payload.waiterSessionId) {
    claims.waiterSessionId = payload.waiterSessionId;
  }

  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET);

  return { token, expiresAt };
}

export async function verifyToken(token: string): Promise<(TokenPayload & { restaurantId: string }) | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    const restaurantId = typeof payload.restaurantId === "string" ? payload.restaurantId : "default";
    const waiterSessionId = typeof payload.waiterSessionId === "string" ? payload.waiterSessionId : undefined;

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
      restaurantId,
      waiterSessionId,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export async function refreshToken(
  payload: Omit<TokenPayload, "iat" | "exp"> & { restaurantId: string }
): Promise<{ token: string; expiresAt: Date }> {
  return createToken({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    restaurantId: payload.restaurantId,
    waiterSessionId: payload.waiterSessionId,
  });
}
