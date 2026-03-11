import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().nonempty("El correo electrónico es obligatorio").email("Correo electrónico inválido"),
  password: z
    .string()
    .nonempty("La contraseña es obligatoria")
    .min(6, "Mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .nonempty("El nombre completo es obligatorio"),

  company_name: z.string().trim().nonempty("El nombre de la empresa es obligatorio"),

  email: z
    .string()
    .trim()
    .nonempty("El correo electrónico es obligatorio")
    .email("Dirección de correo electrónico inválida"),

  password: z
    .string()
    .trim()
    .nonempty("La contraseña es obligatoria")
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().nonempty("El correo electrónico es obligatorio").email("Correo electrónico inválido"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .trim()
      .nonempty("La contraseña es obligatoria")
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
      .regex(/[0-9]/, "Debe contener al menos un número"),
    confirmPassword: z.string().trim().nonempty("Por favor, confirma tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });


export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
