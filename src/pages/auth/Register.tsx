import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardFooter } from "@/components/ui/card";
import { FormField } from "@/components/ui/form";
import authUIBgImage from "../../assets/auth_pages_bg.jpg";

import { Mail, Lock, User } from "lucide-react";

const registerSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .optional()
    .or(z.literal("")),
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

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const onSubmit = (data: RegisterFormValues) => {
    console.log(data);
    form.reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-5xl shadow-xl rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <div className="p-10 bg-white flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
              V
            </div>
            <span className="text-2xl font-semibold text-gray-800">
              VoiceFlow
            </span>
          </div>

          <h1 className="sm:text-3xl text-2xl font-bold text-gray-900 mb-2">
            Create your account
          </h1>
          <p className="text-gray-500 mb-8">
            Sign up to start managing your sales reports
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <FormField
              name="name"
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
                      placeholder="John Doe"
                      className="pl-10 h-12 border-gray-300 rounded-lg"
                      disabled={isSubmitting}
                    />
                  </div>
                  {fieldState.error && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldState.error.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Optional</p>
                </div>
              )}
            />

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
                      placeholder="you@company.com"
                      className="pl-10 h-12 border-gray-300 rounded-lg"
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
                      type="password"
                      placeholder="Create a strong password"
                      className="pl-10 h-12 border-gray-300 rounded-lg"
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
              className="w-full h-12 bg-blue-500 hover:bg-blue-400 text-white font-medium rounded-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <CardFooter className="flex justify-center mt-3 px-0">
            <p className="text-center text-gray-600 text-sm">
              Already have an account?{" "}
              <Link
                to="/auth/login"
                className="font-medium text-blue-500 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </div>

        <div
          className="hidden md:block relative"
          style={{
            backgroundImage: `url(${authUIBgImage})`,

            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-blue-900/70 p-10 flex flex-col justify-end">
            <h2 className="text-white text-3xl font-bold leading-snug">
              Join VoiceFlow and boost your sales insights
            </h2>
            <p className="text-white/80 mt-4 text-sm">
              Automate data collection for your team and generate actionable
              reports effortlessly.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
