import { supabase } from "../lib/supabase/client";

export const BrevoTemplates = {
  InviteSalesPerson: 1,
} as const;

export type BrevoTemplate = typeof BrevoTemplates[keyof typeof BrevoTemplates];

export interface BrevoAttachment {
  name: string;
  content: string;
  contentType?: string;
}

export interface BrevoTemplateParams {
  company_name?: string;
  user_name?: string;
  password?: string;
  [key: string]: string | undefined;
}

export class BrevoUtils {
  static async send(
    template: BrevoTemplate,
    data: BrevoTemplateParams,
    to: string,
    toName?: string,
    attachment?: BrevoAttachment[]
  ): Promise<boolean> {
    try {
      const { data: responseData, error } = await supabase.functions.invoke(
        "send-email",
        {
          body: {
            templateId: template,
            to: to,
            toName: toName,
            params: data,
            attachment: attachment,
          },
        }
      );

      if (error) {
        console.error("Brevo service error:", error);
        throw new Error(error.message || "Failed to send email");
      }

      if (responseData?.error) {
        const errorMessage =
          typeof responseData.error === "string"
            ? responseData.error
            : responseData.error?.message || "Email API error";
        throw new Error(errorMessage);
      }

      if (responseData?.messageId) {
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error sending email via Brevo:", error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("An unexpected error occurred while sending email");
    }
  }
}
