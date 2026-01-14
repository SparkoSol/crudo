import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { forgotPasswordSchema } from "@/schemas/authSchemas";
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export default function ForgotPassword() {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ForgotPasswordFormValues) => {
    console.log("Forgot Password Email:", data);
    form.reset();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg rounded-2xl p-8 bg-white">
        <Link
          to="/auth/login"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-500 mb-6"
        >
          <ArrowLeft size={18} />
          Back to Login
        </Link>

        <h1 className="sm:text-3xl text-2xl  font-bold text-gray-900 mb-2">
          Forgot your password?
        </h1>
        <p className="text-gray-500 mb-6 text-sm">
          Enter your email address and we’ll send you a link to reset your
          password.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
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

          <Button
            type="submit"
            className="w-full h-12 bg-blue-500 hover:bg-blue-400 text-white rounded-lg"
          >
            Submit
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Remember your password?{" "}
          <Link
            to="/auth/login"
            className="text-blue-500 font-medium hover:underline"
          >
            Login
          </Link>
        </p>
      </Card>
    </div>
  );
}
