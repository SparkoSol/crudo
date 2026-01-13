const RoleValues = {
  MANAGER: "Manager",
  SALES_REPRESENTATIVE: "SalesRepresentative",
} as const;

export type Role = (typeof RoleValues)[keyof typeof RoleValues];
export const Role = RoleValues;

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: Role;
  [key: string]: unknown;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RefreshTokenResponse {
  token: string;
}

