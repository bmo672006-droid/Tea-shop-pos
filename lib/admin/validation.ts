import type { UserRole } from "@lib/auth/types";

export const VALID_ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "MANAGER", "COUNTER"];
export const VALID_WAITER_ROLE: UserRole = "WAITER";
export const ALL_VALID_ROLES: UserRole[] = ["SUPER_ADMIN", "MANAGER", "COUNTER", "WAITER"];

export interface CreateAdminDto {
  email: string;
  name: string;
  pin: string;
  role: UserRole;
}

export interface UpdateAdminDto {
  name?: string;
  email?: string;
  pin?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateWaiterDto {
  email: string;
  name: string;
  pin: string;
}

export interface UpdateWaiterDto {
  name?: string;
  email?: string;
  pin?: string;
  isActive?: boolean;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePin(pin: string): { valid: boolean; error?: string } {
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

export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name) {
    return { valid: false, error: "Name is required" };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: "Name must be at least 2 characters" };
  }

  if (name.length > 100) {
    return { valid: false, error: "Name must not exceed 100 characters" };
  }

  return { valid: true };
}

export function validateAdminRole(role: string): { valid: boolean; error?: string } {
  if (!role) {
    return { valid: false, error: "Role is required" };
  }

  if (!VALID_ADMIN_ROLES.includes(role as UserRole)) {
    return {
      valid: false,
      error: `Invalid admin role. Must be one of: ${VALID_ADMIN_ROLES.join(", ")}`,
    };
  }

  return { valid: true };
}

export function validateCreateAdminDto(dto: CreateAdminDto): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate email
  if (!dto.email) {
    errors.push("Email is required");
  } else if (!validateEmail(dto.email)) {
    errors.push("Invalid email format");
  }

  // Validate name
  const nameValidation = validateName(dto.name);
  if (!nameValidation.valid) {
    errors.push(nameValidation.error!);
  }

  // Validate PIN
  const pinValidation = validatePin(dto.pin);
  if (!pinValidation.valid) {
    errors.push(pinValidation.error!);
  }

  // Validate role
  const roleValidation = validateAdminRole(dto.role);
  if (!roleValidation.valid) {
    errors.push(roleValidation.error!);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateCreateWaiterDto(dto: CreateWaiterDto): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate email
  if (!dto.email) {
    errors.push("Email is required");
  } else if (!validateEmail(dto.email)) {
    errors.push("Invalid email format");
  }

  // Validate name
  const nameValidation = validateName(dto.name);
  if (!nameValidation.valid) {
    errors.push(nameValidation.error!);
  }

  // Validate PIN
  const pinValidation = validatePin(dto.pin);
  if (!pinValidation.valid) {
    errors.push(pinValidation.error!);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateUpdateAdminDto(dto: UpdateAdminDto): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (dto.email && !validateEmail(dto.email)) {
    errors.push("Invalid email format");
  }

  if (dto.name && !validateName(dto.name).valid) {
    const nameValidation = validateName(dto.name);
    errors.push(nameValidation.error!);
  }

  if (dto.pin && !validatePin(dto.pin).valid) {
    const pinValidation = validatePin(dto.pin);
    errors.push(pinValidation.error!);
  }

  if (dto.role && !validateAdminRole(dto.role).valid) {
    const roleValidation = validateAdminRole(dto.role);
    errors.push(roleValidation.error!);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
