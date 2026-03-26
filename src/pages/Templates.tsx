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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Plus, Search, Edit, Trash2, Loader2, MapPin, Lock } from "lucide-react";
import {
  getUserTemplatesWithPlan,
  createUserTemplate,
  updateUserTemplate,
  deleteUserTemplate,
} from "@/services/transcriptServices";
import type { UserTemplate } from "@/types";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

interface TemplateField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

const PLACE_VISITED_FIELD: TemplateField = {
  name: "place_visited",
  label: "Lugar Visitado",
  type: "text",
  required: true,
};

export default function Templates() {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UserTemplate | null>(
    null,
  );
  const [planType, setPlanType] = useState<string>("starter");
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("regular");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);

      const { templates, planType } = await getUserTemplatesWithPlan();

      setTemplates(templates);
      setPlanType(planType);
    } catch (error) {
      toast.error("Error al cargar las plantillas");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateType("regular");
    setDescription("");
    setFields([]);
    setIsDefault(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: UserTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    const customFields = (template.fields as TemplateField[]).filter(
      (f) => f.name !== "place_visited"
    );
    setFields(customFields);
    setIsDefault(template.is_default);
    setDescription(template.description || "");
    setTemplateType(template.template_type || "regular");
    setIsDialogOpen(true);
  };

  const addField = () => {
    setFields([
      ...fields,
      { name: "", label: "", type: "text", required: false },
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<TemplateField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error("Se requiere el nombre de la plantilla");
      return;
    }

    const invalidFields = fields.filter((f) => !f.name.trim());
    if (invalidFields.length > 0) {
      toast.error("Todos los campos deben tener un nombre");
      return;
    }

    const allFields = [PLACE_VISITED_FIELD, ...fields.filter(f => f.name !== "place_visited")];

    try {
      setSaving(true);

      if (editingTemplate) {
        await updateUserTemplate(editingTemplate.id, {
          name: templateName,
          fields: allFields,
          is_default: isDefault,
          description,
          template_type: templateType,
        });

        toast.success("Plantilla actualizada con éxito");
      } else {
        await createUserTemplate(
          templateName,
          allFields,
          undefined,
          isDefault,
          description,
          templateType,
        );
        toast.success("Plantilla creada con éxito");
      }

      setIsDialogOpen(false);
      loadTemplates();
    } catch {
      toast.error("Error al guardar la plantilla");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta plantilla?")) return;

    try {
      await deleteUserTemplate(templateId);
      toast.success("Plantilla eliminada con éxito");
      loadTemplates();
    } catch {
      toast.error("Error al eliminar la plantilla");
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-6">
      {/* HEADER */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Plantillas</h1>
          <p className="text-gray-600">Crea y gestiona plantillas de informes</p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="gap-2 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 shadow-md"
          disabled={planType === "starter" && templates.length >= 3}
        >
          <Plus className="h-4 w-4" />
          Crear Plantilla
        </Button>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary-600" />
          </div>
        ) : templates.length === 0 ? (
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aún no se han creado plantillas
              </h3>
              <p className="text-gray-600 mb-6">
                Crea tu primera plantilla para empezar a generar informes estructurados
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* SEARCH */}
            <div className="mb-6 max-w-md relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar plantillas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard title="Total de Plantillas" value={templates.length} />
              <StatCard
                title="Total de Campos"
                value={templates.reduce((sum, t) => sum + t.fields.length, 0)}
              />
            </div>
          </>
        )}
      </div>

      {/* TEMPLATE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {filteredTemplates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle>{template.name}</CardTitle>
                  {template.is_default && <Badge>Predeterminada</Badge>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardDescription>
                Creada el {format(new Date(template.created_at), "PP", { locale: es })}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Plantilla" : "Crear Nueva Plantilla"}
            </DialogTitle>
            <DialogDescription>
              Crea y gestiona plantillas de informes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6 ">
            {/* NAME + TYPE */}
            <div className="grid grid-cols-2 gap-4 ">
              <div>
                <Label>Nombre de la Plantilla</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="mt-3"
                />
              </div>

              <div>
                <Label>Tipo de Plantilla</Label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  className=" w-full h-10 px-3 rounded-md border  mt-3"
                >
                  <option value="regular">Plantilla Regular</option>
                </select>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <Label>Descripción</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 rounded-md border text-sm resize-none"
              />
            </div>

            {/* FIELDS */}
            <div>
              <div className="flex justify-between mb-3">
                <Label className="text-lg font-semibold">Campos de la Plantilla</Label>
                <Button size="sm" variant="outline" onClick={addField}>
                  <Plus className="h-4 w-4 mr-1" />
                  Añadir Campo
                </Button>
              </div>

              <div className="space-y-4">
                  <div className="p-4 border-2 border-brand-primary-200 rounded-xl bg-brand-primary-50/40 space-y-3 relative">
                  <div className="absolute -top-2.5 left-3 bg-white px-2 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-brand-primary-600" />
                    <span className="text-xs font-bold text-brand-primary-600 uppercase tracking-wider">Campo del Sistema — Siempre Obligatorio</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-1">
                    <Input
                      value="place_visited"
                      disabled
                      className="bg-white/60 cursor-not-allowed"
                    />
                    <Input
                      value="Lugar Visitado"
                      disabled
                      className="bg-white/60 cursor-not-allowed"
                    />
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-white/60 text-sm text-gray-500">
                      <Lock className="h-3.5 w-3.5" />
                      Texto (Obligatorio)
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    El nombre del lugar/ubicación visitado. Se usa para identificar cada informe en el Panel y WhatsApp.
                  </p>
                </div>

                {/* Information about auto-extracted fields */}
                <div className="p-4 border border-brand-primary-100 rounded-xl bg-brand-primary-50/20 space-y-3 relative">
                  <div className="absolute -top-2.5 left-3 bg-white px-2 flex items-center gap-1">
                    <span className="text-xs font-bold text-brand-primary-500 uppercase tracking-wider italic">Secciones de Extracción Inteligente</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 mt-2">
                    {[
                      { key: 'novedades', label: 'Novedades', emoji: '🆕' },
                      { key: 'ventas_realizadas', label: 'Ventas Realizadas', emoji: '🧾' },
                      { key: 'stock_disponibilidad', label: 'Stock / Disponibilidad', emoji: '🚨' },
                      { key: 'objeciones', label: 'Objeciones', emoji: '🧩' },
                      { key: 'proximos_pasos', label: 'Próximos Pasos', emoji: '📅' },
                      { key: 'sugerencias', label: 'Sugerencias', emoji: '💡' }
                    ].map((field) => (
                      <div key={field.key} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-base">{field.emoji}</span>
                        <span className="font-semibold text-gray-500 min-w-[140px]">{field.label}:</span>
                        <span className="text-xs text-brand-primary-600/70 font-medium bg-brand-primary-50 px-2 py-0.5 rounded-full">Auto-extraído</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 italic">
                    * Estas secciones se extraen automáticamente de forma exhaustiva independientemente de los campos personalizados abajo.
                  </p>
                </div>

                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-xl bg-gray-50 space-y-3"
                  >
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        placeholder="ID del Campo"
                        value={field.name}
                        onChange={(e) =>
                          updateField(index, { name: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Etiqueta del Campo"
                        value={field.label}
                        onChange={(e) =>
                          updateField(index, { label: e.target.value })
                        }
                      />
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateField(index, { type: e.target.value })
                        }
                        className="h-10 px-3 rounded-md border"
                      >
                        <option value="text">Texto</option>
                        <option value="number">Número</option>
                        <option value="date">Fecha</option>
                        <option value="email">Correo</option>
                        <option value="phone">Teléfono</option>
                      </select>
                    </div>

                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) =>
                            updateField(index, { required: e.target.checked })
                          }
                        />
                        Obligatorio
                      </label>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeField(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 shadow-md"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin " />
                    Guardando...
                  </>
                ) : (
                  "Guardar Plantilla"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6 flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <FileText className="h-6 w-6 text-gray-400" />
      </CardContent>
    </Card>
  );
}
