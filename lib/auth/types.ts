export type UserRole = "SUPER_ADMIN" | "MANAGER" | "COUNTER" | "WAITER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  restaurantId: string;
  waiterSessionId?: string;
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  pin: string;
  email?: string;
  waiterCode?: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  expiresAt: string;
  session?: {
    id: string;
    deviceId: string;
  };
}

export const AUTH_COOKIE_NAME = "pos-session";
export const TOKEN_EXPIRY_HOURS = 8;
export const PIN_LENGTH = 4;
