import { supabase } from "../lib/supabase/client";
import type { WhatsAppSendRequest, WhatsAppSendResponse } from "../types/whatsapp.types";


export class WhatsAppUtils {

  static async sendMessage(params: WhatsAppSendRequest): Promise<WhatsAppSendResponse> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      throw new Error("User not authenticated");
    }

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp`;

    const messageType = params.type || "text";
    let whatsappPayload: WhatsAppSendRequest;

    if (messageType === "interactive" && params.interactive) {
      whatsappPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "interactive",
        interactive: params.interactive,
      };
    } else if (messageType === "template" && params.templateName) {
      whatsappPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "template",
        template: {
          name: params.templateName,
          language: {
            code: "en_US",
          },
          ...(params.templateParams && params.templateParams.length > 0 && {
            components: [
              {
                type: "body",
                parameters: params.templateParams.map((param) => ({
                  type: "text",
                  text: param,
                })),
              },
            ],
          }),
        },
      };
    } else {
      whatsappPayload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "text",
        text: {
          body: params.text?.body || "",
        },
      };
    }

    const res = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(whatsappPayload),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.error || json?.message || "Failed to send WhatsApp message");
    }

    return json;
  }

  static async sendInteractiveMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<WhatsAppSendResponse> {
    return this.sendMessage({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: bodyText,
        },
        action: {
          buttons: buttons.map((btn) => ({
            type: "reply",
            reply: {
              id: btn.id,
              title: btn.title,
            },
          })),
        },
      },
    });
  }

  static async testConnection(testPhoneNumber: string): Promise<boolean> {
    try {
      const result = await this.sendMessage({
        messaging_product: "whatsapp",
        to: testPhoneNumber,
        type: "text",
        text: {
          body: "WhatsApp integration test successful! Your WhatsApp Business API is working correctly.",
        },
      });
      return result.success === true;
    } catch (error) {
      console.error("WhatsApp test failed:", error);
      throw error;
    }
  }
}
