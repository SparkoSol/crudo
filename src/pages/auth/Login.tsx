import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { loginSchema } from "@/schemas/authSchemas";
import { AuthImageSection } from "@/components/auth";
import { signIn } from "@/services/authServices";
import toast from "react-hot-toast";
import iNotusLogo from "@/assets/iNotus-color.svg";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await signIn({
        email: data.email,
        password: data.password,
      });

      toast.success("Login successful!");
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Login error:", error);
      const errorMessage =
        error?.message || "Invalid email or password. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl shadow-lg rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <div className="p-10 bg-white flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-8">
            <img 
              src={iNotusLogo} 
              alt="iNotus Logo" 
              className="w-10 h-10 rounded-lg object-contain"
            />
            <span className="text-2xl font-semibold text-gray-800">iNotus</span>
          </div>

          <h1 className="sm:text-3xl text-2xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-500 mb-8">
            Login to manage your sales reports
          </p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <Input
                      {...field}
                      className="pl-10 h-12 border-gray-300 rounded-lg"
                      placeholder="you@company.com"
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
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <Input
                      {...field}
                      type={showPassword ? "text" : "password"}
                      className="pl-10 pr-10 h-12 border-gray-300 rounded-lg"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {fieldState.error && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />

            <div className="flex justify-end">
              <Link
                to="/auth/forgot-password"
                className="text-sm text-brand-primary-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700
               hover:from-brand-primary-700 hover:to-brand-primary-800 text-white font-medium rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <CardFooter className="flex justify-center items-center mt-3 px-0">
            <p className="text-center text-gray-600 text-sm">
              Don't have an account?{" "}
              <Link
                to="/auth/register"
                className="text-brand-primary-600 font-medium hover:underline"
              >
                Create an account
              </Link>
            </p>
          </CardFooter>
        </div>

        <AuthImageSection
          title="Transform sales conversations into actionable insights"
          description="iNotus helps your sales team capture field data automatically and turn it into smart reports."
        />
      </Card>
    </div>
  );
}
