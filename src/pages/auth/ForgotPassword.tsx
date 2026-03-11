import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { forgotPasswordSchema } from "@/schemas/authSchemas";
import { resetPassword } from "@/services/authServices";
import toast from "react-hot-toast";

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await resetPassword(data.email);
      setIsSuccess(true);
      toast.success("¡Correo de restablecimiento de contraseña enviado! Revisa tu bandeja de entrada.");
      form.reset();
    } catch (error: any) {
      console.error("Password reset error:", error);
      const errorMessage =
        error?.message || "Error al enviar el correo de restablecimiento. Por favor, inténtalo de nuevo.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg rounded-2xl p-8 bg-white">
        <Link
          to="/auth/login"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-primary-600 mb-6"
        >
          <ArrowLeft size={18} />
          Volver al Inicio de Sesión
        </Link>

        <h1 className="sm:text-3xl text-2xl  font-bold text-gray-900 mb-2">
          ¿Has olvidado tu contraseña?
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          Introduce tu dirección de correo electrónico y te enviaremos un enlace para restablecer tu
          contraseña.
        </p>

        {isSuccess ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">¡Correo enviado con éxito!</p>
                <p className="text-green-700">
                  Hemos enviado un enlace de restablecimiento de contraseña a tu dirección de correo electrónico. Por
                  favor, revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu
                  contraseña.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección de correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <Input
                      {...field}
                      className="pl-10 h-12 border-gray-300 rounded-lg"
                      placeholder="you@company.com"
                      disabled={isSubmitting}
                    />
                  </div>
                  {fieldState.error && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 text-white rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                  Enviando...
                </>
              ) : (
                "Enviar Enlace de Restablecimiento"
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Recuerdas tu contraseña?{" "}
          <Link
            to="/auth/login"
            className="text-brand-primary-600 font-medium hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
      </Card>
    </div>
  );
}
