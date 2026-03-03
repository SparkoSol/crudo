import { supabase } from "../lib/supabase/client";
import type { VoiceTranscript, UserTemplate, TemplateField } from "@/types";

export const getTranscripts = async (): Promise<VoiceTranscript[]> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("voice_transcripts")
    .select(
      `
      *,
      user_templates:template_id (
        id,
        name,
        fields
      ),
      profiles:user_id (
        full_name,
        phone_number
      )
    `,
    )
    .eq("user_id", session.user.id)
    .neq("is_session_record", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as VoiceTranscript[];
};

export const getTranscript = async (
  transcriptId: string,
): Promise<VoiceTranscript | null> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("voice_transcripts")
    .select(
      `
      *,
      user_templates:template_id (
        id,
        name,
        fields
      ),
      profiles:user_id (
        full_name,
        phone_number
      )
    `,
    )
    .eq("id", transcriptId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data as VoiceTranscript;
};

export const getManagerTranscripts = async (): Promise<VoiceTranscript[]> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const { data: teamMembers, error: teamError } = await supabase
    .from("profiles")
    .select("id")
    .eq("manager_id", session.user.id);

  if (teamError) {
    throw teamError;
  }

  const teamIds = teamMembers.map((member) => member.id);
  const allIds = [session.user.id, ...teamIds];

  const { data, error } = await supabase
    .from("voice_transcripts")
    .select(
      `
      *,
      user_templates:template_id (
        id,
        name,
        fields
      ),
      profiles:user_id (
        full_name,
        phone_number
      )
    `,
    )
    .in("user_id", allIds)
    .neq("is_session_record", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as VoiceTranscript[];
};

export const downloadPDF = async (
  transcriptId: string,
): Promise<{ pdf: string; filename: string }> => {
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

export const getUserTemplatesWithPlan = async (): Promise<{
  templates: UserTemplate[];
  planType: string;
}> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const userId = session.user.id;

  //  Get templates
  const { data: templates, error: templateError } = await supabase
    .from("user_templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (templateError) throw templateError;

  //  Get subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_type")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planType = subscription?.plan_type || "starter";

  return {
    templates: templates as UserTemplate[],
    planType,
  };
};

export const getUserTemplate = async (
  templateId?: string,
): Promise<UserTemplate | null> => {
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
  fields: TemplateField[],
  templateStructure?: Record<string, unknown>,
  isDefault?: boolean,
  description?: string,
  templateType?: string,
): Promise<UserTemplate> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  const userId = session.user.id;

  //  1. Get user subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_type")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planType = subscription?.plan_type || "starter";

  //  2. Count existing templates
  const { count } = await supabase
    .from("user_templates")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  //  3. Enforce Starter limit
  if (planType === "starter" && (count ?? 0) >= 3) {
    throw new Error(
      "Starter plan allows maximum 3 templates. Please upgrade your plan.",
    );
  }

  // ✅ 4. Create template
  const { data, error } = await supabase
    .from("user_templates")
    .insert({
      user_id: userId,
      name,
      fields,
      template_structure: templateStructure || null,
      is_default: isDefault || false,
      description: description || null,
      template_type: templateType || "regular",
    })
    .select()
    .single();

  if (error) throw error;

  return data as UserTemplate;
};

export const updateUserTemplate = async (
  templateId: string,
  updates: {
    name?: string;
    fields?: TemplateField[];
    template_structure?: Record<string, unknown>;
    description?: string;
    template_type?: string;
    is_default?: boolean;
  },
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

  if (error) throw error;

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

export const deleteTranscript = async (transcriptId: string): Promise<void> => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("User not authenticated");
  }

  // Delete any session/state records that reference this report as a modification target
  await supabase
    .from("voice_transcripts")
    .delete()
    .eq("modification_target_id", transcriptId);

  // Delete the report itself
  const { error } = await supabase
    .from("voice_transcripts")
    .delete()
    .eq("id", transcriptId);

  if (error) {
    throw error;
  }
};
