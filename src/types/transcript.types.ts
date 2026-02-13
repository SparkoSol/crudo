export interface VoiceTranscript {
  id: string;
  user_id: string;
  phone_number: string;
  transcript: string;
  template_id: string | null;
  filled_data: Record<string, unknown> | null;
  status: "pending" | "confirmed" | "retaken";
  created_at: string;
  updated_at: string;
  user_templates?: {
    id: string;
    name: string;
    fields: TemplateField[];
  } | null;
  profiles?: {
    full_name: string | null;
    phone_number: string | null;
  } | null;
}

export interface TemplateField {
  name: string; // internal key
  label: string; // display label
  type: string;
  required: boolean;
}

export interface UserTemplate {
  id: string;
  user_id: string;
  name: string;
  fields: TemplateField[];
  template_structure: Record<string, unknown> | null;
  description: string | null;
  template_type: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
