import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Plus, Search, Edit, Trash2, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserTemplates, createUserTemplate, updateUserTemplate, deleteUserTemplate, type UserTemplate } from '@/services/transcriptServices';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface TemplateField {
  name: string;
  type: string;
  required: boolean;
}

export default function Templates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<UserTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
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
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };
  
  const openCreateDialog = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setFields([]);
    setIsDefault(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (template: UserTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setFields(template.fields);
    setIsDefault(template.is_default);
    setIsDialogOpen(true);
  };

  const addField = () => {
    setFields([...fields, { name: '', type: 'text', required: false }]);
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
      toast.error('Template name is required');
      return;
    }

    if (fields.length === 0) {
      toast.error('At least one field is required');
      return;
    }

    const invalidFields = fields.filter(f => !f.name.trim());
    if (invalidFields.length > 0) {
      toast.error('All fields must have a name');
      return;
    }

    try {
      setSaving(true);
      if (editingTemplate) {
        await updateUserTemplate(editingTemplate.id, {
          name: templateName,
          fields: fields,
          is_default: isDefault,
        });
        toast.success('Template updated successfully');
      } else {
        await createUserTemplate(templateName, fields, undefined, isDefault);
        toast.success('Template created successfully');
      }
      setIsDialogOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await deleteUserTemplate(templateId);
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const defaultTemplate = templates.find(t => t.is_default);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="p-6 lg:p-8 pt-20 lg:pt-6">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Templates</h1>
                <p className="text-gray-600">
                  Create and manage templates for voice transcript processing
                </p>
              </div>
              <Button
                onClick={openCreateDialog}
                className="gap-2 bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 hover:from-brand-primary-700 hover:to-brand-primary-800 shadow-md"
              >
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Templates</p>
                    <p className="text-2xl font-bold text-gray-900">{templates.length}</p>
                  </div>
                  <div className="p-3 bg-brand-primary-100 rounded-lg">
                    <FileText className="h-6 w-6 text-brand-primary-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Default Template</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {defaultTemplate ? <CheckCircle2 className="h-6 w-6 text-green-600" /> : '0'}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Fields</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {templates.reduce((sum, t) => sum + t.fields.length, 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary-600" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No templates yet</h3>
                <p className="text-gray-600 mb-4">
                  Create your first template to start processing voice transcripts
                </p>
                <Button onClick={openCreateDialog} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-1">{template.name}</CardTitle>
                        {template.is_default && (
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs mt-1">
                            Default
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      Created {format(new Date(template.created_at), 'PP')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Fields ({template.fields.length}):</p>
                      <div className="space-y-1">
                        {template.fields.slice(0, 5).map((field, idx) => (
                          <div key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                            <span className="font-medium">{field.name}</span>
                            <span className="text-xs text-gray-400">({field.type})</span>
                            {field.required && (
                              <span className="text-xs text-red-600">*</span>
                            )}
                          </div>
                        ))}
                        {template.fields.length > 5 && (
                          <p className="text-xs text-gray-400">
                            +{template.fields.length - 5} more fields
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </DialogTitle>
                <DialogDescription>
                  Define fields that will be extracted from voice transcripts
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <div>
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Sales Report"
                    className="mt-1"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Fields</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addField}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Field
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Field Name</Label>
                            <Input
                              value={field.name}
                              onChange={(e) => updateField(index, { name: e.target.value })}
                              placeholder="e.g., Customer Name"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Type</Label>
                            <select
                              value={field.type}
                              onChange={(e) => updateField(index, { type: e.target.value })}
                              className="mt-1 w-full h-10 px-3 rounded-md border border-gray-300"
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="email">Email</option>
                              <option value="phone">Phone</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex items-end gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateField(index, { required: e.target.checked })}
                              className="rounded"
                            />
                            Required
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeField(index)}
                            className="h-8 w-8 p-0 text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {fields.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No fields added yet. Click "Add Field" to get started.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-default"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="is-default" className="cursor-pointer">
                    Set as default template
                  </Label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Template'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
