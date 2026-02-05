import { supabase } from "../lib/supabase/client";
import type { BrevoTemplateParams, BrevoAttachment } from "@/types";

export class BrevoUtils {
  static async send(
    template: number,
    data: BrevoTemplateParams,
    to: string,
    toName?: string,
    attachment?: BrevoAttachment[]
  ): Promise<boolean> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error("User not authenticated");
    }

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`;

    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        templateId: template,
        to,
        toName,
        params: data,
        attachment,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error || json?.message || "Failed to send email");
    }

    return json?.success === true;
  }
}

