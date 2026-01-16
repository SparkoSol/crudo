import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardFooter } from "@/components/ui/card";
import { FormField } from "@/components/ui/form";

import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { AuthImageSection } from "@/components/auth";
import iNotusLogo from "@/assets/iNotus-color.svg";

import { registerSchema } from "@/schemas/auth.schemas";
import { signupSupabase } from "@/services/SignUpSupabase";

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      company_name: "",
      email: "",
      password: "",
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await signupSupabase(data);
      toast.success(
        "Account created successfully! Please check your email to verify your account."
      );
      form.reset();
      navigate("/auth/login");
    } catch (err: any) {
      console.error("Signup error:", err);
      const errorMessage =
        err?.message || "Failed to create account. Please try again.";
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl shadow-lg rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* LEFT */}
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
            Create your account
          </h1>
          <p className="text-gray-500 mb-8">
            Sign up to start managing your sales reports
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* FULL NAME */}
            <FormField
              name="full_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <Input
                      {...field}
                      className="pl-10 h-12 border-gray-300 rounded-lg"
                      placeholder="John Doe"
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

            {/* COMPANY NAME */}
            <FormField
              name="company_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <Input
                      {...field}
                      className="pl-10 h-12 border-gray-300 rounded-lg"
                      placeholder="Udev"
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

            {/* EMAIL */}
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
                      type="email"
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

            {/* PASSWORD */}
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
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none disabled:opacity-50"
                      tabIndex={-1}
                      disabled={isSubmitting}
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

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700
               hover:from-brand-primary-700 hover:to-brand-primary-800 text-white font-medium rounded-lg shadow-md"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <CardFooter className="flex justify-center items-center mt-3 px-0">
            <p className="text-center text-gray-600 text-sm">
              Already have an account?{" "}
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
          title="Join iNotus and boost your sales insights"
          description="Automate data collection and generate smart reports effortlessly."
        />
      </Card>
    </div>
  );
}
