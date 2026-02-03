import { supabase } from "../lib/supabase/client";

export interface VoiceTranscript {
  id: string;
  user_id: string;
  phone_number: string;
  transcript: string;
  template_id: string | null;
  filled_data: Record<string, any> | null;
  status: "pending" | "confirmed" | "retaken";
  created_at: string;
  updated_at: string;
  user_templates?: {
    id: string;
    name: string;
    fields: Array<{ name: string; type: string; required: boolean }>;
  } | null;
}

export interface UserTemplate {
  id: string;
  user_id: string;
  name: string;
  fields: Array<{ name: string; type: string; required: boolean }>;
  template_structure: Record<string, any> | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const getTranscripts = async (): Promise<VoiceTranscript[]> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("voice_transcripts")
    .select(`
      *,
      user_templates:template_id (
        id,
        name,
        fields
      )
    `)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as VoiceTranscript[];
};

export const getTranscript = async (transcriptId: string): Promise<VoiceTranscript | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("voice_transcripts")
    .select(`
      *,
      user_templates:template_id (
        id,
        name,
        fields
      )
    `)
    .eq("id", transcriptId)
    .eq("user_id", session.user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data as VoiceTranscript;
};

export const downloadPDF = async (transcriptId: string): Promise<{ pdf: string; filename: string }> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`;

  const res = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ transcriptId }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error || json?.message || "Failed to generate PDF");
  }

  return json;
};

export const getUserTemplates = async (): Promise<UserTemplate[]> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("user_templates")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as UserTemplate[];
};

export const getUserTemplate = async (templateId?: string): Promise<UserTemplate | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  if (templateId) {
    const { data, error } = await supabase
      .from("user_templates")
      .select("*")
      .eq("id", templateId)
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data as UserTemplate;
  } else {
    // Get default template
    const { data, error } = await supabase
      .from("user_templates")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_default", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    return data as UserTemplate;
  }
};

export const createUserTemplate = async (
  name: string,
  fields: Array<{ name: string; type: string; required: boolean }>,
  templateStructure?: Record<string, any>,
  isDefault?: boolean
): Promise<UserTemplate> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("user_templates")
    .insert({
      user_id: session.user.id,
      name,
      fields,
      template_structure: templateStructure || null,
      is_default: isDefault || false,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as UserTemplate;
};

export const updateUserTemplate = async (
  templateId: string,
  updates: {
    name?: string;
    fields?: Array<{ name: string; type: string; required: boolean }>;
    template_structure?: Record<string, any>;
    is_default?: boolean;
  }
): Promise<UserTemplate> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("user_templates")
    .update(updates)
    .eq("id", templateId)
    .eq("user_id", session.user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as UserTemplate;
};

export const deleteUserTemplate = async (templateId: string): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from("user_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", session.user.id);

  if (error) {
    throw error;
  }
};
