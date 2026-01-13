import type { User } from "../../types/auth.types";
import { Role } from "../../types/auth.types";

export const hasRole = (user: User | null | undefined, role: Role): boolean => {
  if (!user) return false;
  return user.role === role;
};

export const isManager = (user: User | null | undefined): boolean => {
  console.log("User", user);
  return hasRole(user, Role.MANAGER);
};

export const isSalesRepresentative = (
  user: User | null | undefined
): boolean => {
  return hasRole(user, Role.SALES_REPRESENTATIVE);
};

export const hasAnyRole = (
  user: User | null | undefined,
  roles: Role[]
): boolean => {
  if (!user) return false;
  return roles.includes(user.role as Role);
};
