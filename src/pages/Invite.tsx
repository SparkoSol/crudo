import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  UserPlus,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { inviteSalesRepresentative } from "@/services/inviteServices";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .nonempty("Email is required")
    .email("Invalid email address"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export default function Invite() {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: InviteFormValues) => {
    if (!user || !profile) {
      toast.error("User information not available");
      return;
    }

    if (profile.role !== "manager") {
      toast.error("Only managers can invite sales representatives");
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteSalesRepresentative({
        email: data.email,
        managerId: profile.id,
        managerFullName: profile.full_name,
        managerCompanyName: profile.company_name || null,
      });

      toast.success(`Invitation sent successfully to ${data.email}`);
      setInvitedEmail(data.email);
      reset();
    } catch (error: unknown) {
      console.error("Error inviting sales representative:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to send invitation. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="p-6 lg:p-8 pt-20 lg:pt-6 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Invite Sales Representative
            </h1>
            <p className="text-gray-600">
              Send an invitation to a sales representative to join your team
            </p>
          </div>

          <div className="space-y-6">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary-100 rounded-lg">
                    <UserPlus className="h-5 w-5 text-brand-primary-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Send Invitation</CardTitle>
                    <CardDescription className="mt-1">
                      Enter the email address of the sales representative you
                      want to invite
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        className={cn(
                          "pl-10 h-11",
                          errors.email &&
                          "border-red-500 focus:border-red-500 focus:ring-red-500"
                        )}
                        placeholder="sales.representative@example.com"
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="gap-2 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 shadow-md"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending Invitation...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                  </div>
                </form>

                {invitedEmail && (
                  <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-green-800">
                        <p className="font-medium mb-1">
                          Invitation sent successfully!
                        </p>
                        <p className="text-green-700">
                          An invitation email has been sent to{" "}
                          <strong>{invitedEmail}</strong>. The sales
                          representative will receive their login credentials
                          via email.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
