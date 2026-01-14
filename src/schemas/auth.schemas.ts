import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().nonempty("Email is required").email("Invalid email"),
  password: z
    .string()
    .nonempty("Password is required")
    .min(6, "Minimum 6 characters"),
});

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .optional(),

  company_name: z.string().trim().nonempty("Company name is required"),

  email: z
    .string()
    .trim()
    .nonempty("Email is required")
    .email("Invalid email address"),

  password: z
    .string()
    .trim()
    .nonempty("Password is required")
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().nonempty("Email is required").email("Invalid email"),
});

// Export types inferred from schemas
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
