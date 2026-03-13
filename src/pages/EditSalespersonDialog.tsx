import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";

interface EditSalespersonDialogProps {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  salesperson: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
    whatsapp_number?: string;
    status: "active" | "inactive";
    template_id?: string;
  } | null;
}

export function EditSalespersonDialog({
  open,
  onClose,
  onUpdated,
  salesperson,
}: EditSalespersonDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    whatsapp_number: "",
    status: "active" as "active" | "inactive",
    template_id: undefined as string | undefined,
  });

  // Load templates dynamically
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

  // Sync form when salesperson changes
  useEffect(() => {
    if (salesperson) {
      setForm({
        full_name: salesperson.full_name || "",
        email: salesperson.email || "",
        phone_number: salesperson.phone_number || "",
        whatsapp_number: salesperson.whatsapp_number || "",
        status: salesperson.status || "active",
        template_id: salesperson.template_id || undefined,
      });
    }
  }, [salesperson]);

  if (!salesperson) return null;

  const validate = () => {
    if (!form.full_name.trim()) {
      toast.error("El nombre completo es obligatorio");
      return false;
    }

    const phoneRegex = /^\+[1-9]\d{1,14}$/;

    if (form.phone_number && !phoneRegex.test(form.phone_number)) {
      toast.error("Formato de número de teléfono no válido");
      return false;
    }

    if (!form.template_id) {
      toast.error("Por favor, selecciona una plantilla");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone_number: form.phone_number || null,
          template_id: form.template_id || null,
          is_active: form.status === "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", salesperson.id);

      if (error) throw error;

      toast.success("Vendedor actualizado con éxito");
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error al actualizar el vendedor");
    } finally {
      setLoading(false);
    }
  };

  const isManager = profile?.role === "manager";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Vendedor</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Nombre Completo</label>
            <Input
              value={form.full_name}
              disabled={!isManager}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Correo Electrónico</label>
            <Input value={form.email} disabled />
          </div>

          <div>
            <label className="text-sm font-medium">Número de Teléfono</label>
            <Input
              disabled={!isManager}
              value={form.phone_number}
              onChange={(e) =>
                setForm({ ...form, phone_number: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium">Estado</label>
            <Select
              disabled={!isManager}
              value={form.status}
              onValueChange={(value: "active" | "inactive") =>
                setForm({ ...form, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Seleccionar Plantilla</label>
            <Select
              disabled={!isManager}
              value={form.template_id}
              onValueChange={(value) =>
                setForm({ ...form, template_id: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar plantilla" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {isManager && (
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
