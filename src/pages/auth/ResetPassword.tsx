import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardFooter } from "@/components/ui/card";
import { FormField } from "@/components/ui/form";

import { Lock, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { AuthImageSection } from "@/components/auth";

import { resetPasswordSchema } from "@/schemas/auth.schemas";
import { updatePassword } from "@/services/authServices";
import { supabase } from "@/lib/supabase/client";

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const validateSession = async () => {
      try {
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const hashType = hashParams.get("type");
          if (hashType && hashType !== "recovery") {
            if (mounted) {
              toast.error("Invalid reset link. Please request a new one.");
              navigate("/auth/forgot-password", { replace: true });
            }
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));
        let sessionCheckCount = 0;
        const maxChecks = 3;

        const checkSession = async (): Promise<boolean> => {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            if (mounted) {
              setIsValidating(false);
            }
            return true;
          }

          return false;
        };

        while (sessionCheckCount < maxChecks) {
          const hasSession = await checkSession();
          if (hasSession) {
            break;
          }

          sessionCheckCount++;
          if (sessionCheckCount < maxChecks) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        if (sessionCheckCount >= maxChecks) {
          const {
            data: { session: finalSession },
          } = await supabase.auth.getSession();

          if (!finalSession && mounted) {
            toast.error(
              "Invalid or expired reset link. Please request a new one."
            );
            navigate("/auth/forgot-password", { replace: true });
            return;
          }

          if (finalSession && mounted) {
            setIsValidating(false);
          }
        }

        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;

          if (
            session &&
            (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY")
          ) {
            setIsValidating(false);
            if (subscription) {
              subscription.unsubscribe();
            }
          }
        });

        subscription = { unsubscribe: () => authSubscription.unsubscribe() };
      } catch (error) {
        console.error("Session validation error:", error);
        if (mounted) {
          toast.error("Failed to validate reset link. Please try again.");
          navigate("/auth/forgot-password", { replace: true });
        }
      }
    };

    validateSession();

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [navigate]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    try {
      await updatePassword(data.password);
      setIsSuccess(true);
      toast.success("Password reset successfully! Redirecting to login...");

      await supabase.auth.signOut();

      setTimeout(() => {
        navigate("/auth/login", { replace: true });
      }, 2000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      const errorMessage =
        error?.message || "Failed to reset password. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg rounded-2xl p-8 bg-white">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary-600" />
          </div>
          <p className="text-center text-gray-600 mt-4">
            Validating reset link...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl shadow-lg rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <div className="p-10 bg-white flex flex-col justify-center">
          <Link
            to="/auth/login"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-primary-600 mb-6"
          >
            <ArrowLeft size={18} />
            Back to Login
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary-600
             to-brand-primary-700 text-white flex items-center justify-center font-bold text-lg shadow-md"
            >
              V
            </div>
            <span className="text-2xl font-semibold text-gray-800">
              VoiceFlow
            </span>
          </div>

          <h1 className="sm:text-3xl text-2xl font-bold text-gray-900 mb-2">
            Reset your password
          </h1>
          <p className="text-gray-500 mb-8">Enter your new password below</p>

          {isSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">
                    Password reset successfully!
                  </p>
                  <p className="text-green-700">
                    Your password has been updated. Redirecting to login...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                      <Input
                        {...field}
                        type="password"
                        className="pl-10 h-12 border-gray-300 rounded-lg"
                        placeholder="••••••••"
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

              <FormField
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                      <Input
                        {...field}
                        type="password"
                        className="pl-10 h-12 border-gray-300 rounded-lg"
                        placeholder="••••••••"
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
                className="w-full h-12 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700
               hover:from-brand-primary-700 hover:to-brand-primary-800 text-white font-medium rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                    Resetting password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          )}

          <CardFooter className="flex justify-center items-center mt-3 px-0">
            <p className="text-center text-gray-600 text-sm">
              Remember your password?{" "}
              <Link
                to="/auth/login"
                className="text-brand-primary-600 font-medium hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </div>

        <AuthImageSection
          title="Secure your account with a strong password"
          description="Choose a password that's unique and hard to guess to keep your account safe."
        />
      </Card>
    </div>
  );
}
