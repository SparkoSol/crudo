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
