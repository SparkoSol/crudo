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
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  getUserTemplates,
  createUserTemplate,
  updateUserTemplate,
  deleteUserTemplate,
} from "@/services/transcriptServices";
// import { subscriptionService } from "@/services/subscriptionService";
import type { UserTemplate } from "@/types";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase/client";

interface TemplateField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

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
  const [templateType, setTemplateType] = useState("regular"); // UI only
  const [description, setDescription] = useState(""); // UI only
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getUserTemplates();
      setTemplates(data);
      // Get subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_type")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .in("status", ["active", "trialing"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setPlanType(subscription?.plan_type || "starter");
    } catch (error) {
      toast.error("Failed to load templates");
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
    setFields(template.fields as TemplateField[]);
    setIsDefault(template.is_default);
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
      toast.error("Template name is required");
      return;
    }

    if (fields.length === 0) {
      toast.error("At least one field is required");
      return;
    }

    const invalidFields = fields.filter((f) => !f.name.trim());
    if (invalidFields.length > 0) {
      toast.error("All fields must have a name");
      return;
    }

    try {
      setSaving(true);

      if (editingTemplate) {
        await updateUserTemplate(editingTemplate.id, {
          name: templateName,
          fields,
          is_default: isDefault,
        });
        toast.success("Template updated successfully");
      } else {
        await createUserTemplate(templateName, fields, undefined, isDefault);
        toast.success("Template created successfully");
      }

      setIsDialogOpen(false);
      loadTemplates();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await deleteUserTemplate(templateId);
      toast.success("Template deleted successfully");
      loadTemplates();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const defaultTemplate = templates.find((t) => t.is_default);

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-6">
      {/* HEADER */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Templates</h1>
          <p className="text-gray-600">Create and manage report templates</p>
        </div>
        <Button
          onClick={openCreateDialog}
          disabled={planType === "starter" && templates.length >= 3}
        >
          Create Template
        </Button>
      </div>

      {/* SEARCH */}
      <div className="mb-6 max-w-md relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Templates" value={templates.length} />
        <StatCard
          title="Default Template"
          value={
            defaultTemplate ? <CheckCircle2 className="text-green-600" /> : "0"
          }
        />
        <StatCard
          title="Total Fields"
          value={templates.reduce((sum, t) => sum + t.fields.length, 0)}
        />
      </div>

      {/* TEMPLATE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle>{template.name}</CardTitle>
                  {template.is_default && <Badge>Default</Badge>}
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
                Created {format(new Date(template.created_at), "PP")}
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
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </DialogTitle>
            <DialogDescription>
              Create and manage report templates
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* NAME + TYPE */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>

              <div>
                <Label>Template Type</Label>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  className=" w-full h-10 px-3 rounded-md border"
                >
                  <option value="regular">Regular Template</option>
                </select>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <Label>Description</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full h-16 px-3 py-2 rounded-md border"
              />
            </div>

            {/* FIELDS */}
            <div>
              <div className="flex justify-between mb-3">
                <Label className="text-lg font-semibold">Template Fields</Label>
                <Button size="sm" variant="outline" onClick={addField}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-xl bg-gray-50 space-y-3"
                  >
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        placeholder="Field Key"
                        value={field.name}
                        onChange={(e) =>
                          updateField(index, { name: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Field Label"
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
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
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
                        Required
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
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 shadow-md"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin " />
                    Saving...
                  </>
                ) : (
                  "Save Template"
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
