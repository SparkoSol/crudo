import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  UserPlus,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  Phone,
  FileText,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { inviteSalesRepresentative } from "@/services/inviteServices";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .nonempty("Se requiere correo electrónico")
    .email("Dirección de correo electrónico inválida"),
  full_name: z
    .string()
    .trim()
    .nonempty("Se requiere el nombre completo"),
  phone_number: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^\+[1-9]\d{1,14}$/.test(val),
      "Formato de número de teléfono no válido (ej: +34612345678)"
    ),
  template_id: z
    .string()
    .nonempty("Se requiere seleccionar una plantilla"),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export default function Invite() {
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>(
    []
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      full_name: "",
      phone_number: "",
      template_id: "",
    },
  });

  // Load templates for the manager
  useEffect(() => {
    const loadTemplates = async () => {
      if (!profile || profile.role !== "manager") return;

      const { data, error } = await supabase
        .from("user_templates")
        .select("id, name")
        .eq("user_id", profile.id);

      if (!error && data) {
        setTemplates(data);
      }
    };

    loadTemplates();
  }, [profile]);

  const onSubmit = async (data: InviteFormValues) => {
    if (!user || !profile) {
      toast.error("Información del usuario no disponible");
      return;
    }

    if (profile.role !== "manager") {
      toast.error("Solo los gerentes pueden invitar representantes de ventas");
      return;
    }

    setIsSubmitting(true);
    try {
      await inviteSalesRepresentative({
        email: data.email,
        fullName: data.full_name,
        phoneNumber: data.phone_number || null,
        templateId: data.template_id,
        managerId: profile.id,
        managerFullName: profile.full_name,
        managerCompanyName: profile.company_name || null,
      });

      toast.success(`Invitación enviada con éxito a ${data.email}`);
      setInvitedEmail(data.email);
      reset();
    } catch (error: unknown) {
      console.error("Error inviting sales representative:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al enviar la invitación. Por favor, inténtalo de nuevo.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Invitar Representante de Ventas
        </h1>
        <p className="text-gray-600">
          Envía una invitación a un representante de ventas para unirse a tu equipo
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
                <CardTitle className="text-xl">Enviar Invitación</CardTitle>
                <CardDescription className="mt-1">
                  Completa los datos del representante de ventas que quieres
                  invitar
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-medium">
                  Nombre Completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="full_name"
                    type="text"
                    {...register("full_name")}
                    className={cn(
                      "pl-10 h-11",
                      errors.full_name &&
                        "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
                    placeholder="Juan Pérez"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.full_name && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.full_name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Correo Electrónico
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
                    placeholder="vendedor@ejemplo.com"
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

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone_number" className="text-sm font-medium">
                  Número de Teléfono{" "}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="phone_number"
                    type="tel"
                    {...register("phone_number")}
                    className={cn(
                      "pl-10 h-11",
                      errors.phone_number &&
                        "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
                    placeholder="+34612345678"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.phone_number && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.phone_number.message}
                  </p>
                )}
              </div>

              {/* Template Selection */}
              <div className="space-y-2">
                <Label htmlFor="template_id" className="text-sm font-medium">
                  Seleccionar Plantilla
                </Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10 pointer-events-none" />
                  <Controller
                    name="template_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger
                          id="template_id"
                          className={cn(
                            "pl-10 h-11",
                            errors.template_id &&
                              "border-red-500 focus:border-red-500 focus:ring-red-500"
                          )}
                        >
                          <SelectValue placeholder="Seleccionar plantilla" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.length === 0 ? (
                            <div className="py-3 px-2 text-sm text-gray-500 text-center">
                              No hay plantillas disponibles
                            </div>
                          ) : (
                            templates.map((template) => (
                              <SelectItem
                                key={template.id}
                                value={template.id}
                              >
                                {template.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                {errors.template_id && (
                  <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.template_id.message}
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
                      Enviando Invitación...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar Invitación
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
                      ¡Invitación enviada con éxito!
                    </p>
                    <p className="text-green-700">
                      Se ha enviado un correo electrónico de invitación a{" "}
                      <strong>{invitedEmail}</strong>. El representante de
                      ventas recibirá sus credenciales de acceso por correo electrónico.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
