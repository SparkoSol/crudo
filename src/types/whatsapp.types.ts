export interface WhatsAppSendRequest {
    to: string;
    type?: "text" | "template";
    templateName?: string;
    templateParams?: string[];
}

export interface WhatsAppSendResponse {
    success: boolean;
    messageId?: string;
    result?: WhatsAppSendRequest;
    error?: string;
    message?: string;
    status?: number;
}

export interface WhatsAppSendRequest {
    messaging_product: string;
    recipient_type?: string;
    to: string;
    type?: "text" | "template";
    text?: {
        body: string;
    };
    template?: {
        name: string;
        language: {
            code: string;
        };
        components?: Array<{
            type: string;
            parameters: Array<{
                type: string;
                text: string;
            }>;
        }>;
    };
}

export interface WhatsAppWebhookRequest {
    object: string;
    entry: Array<{
        id: string;
        changes: Array<{
            value: {
                messaging_product: string;
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: Array<{
                    profile: {
                        name: string;
                    };
                    wa_id: string;
                }>;
                messages?: Array<{
                    from: string;
                    id: string;
                    timestamp: string;
                    type: string;
                    text?: {
                        body: string;
                    };
                    image?: {
                        caption?: string;
                        mime_type: string;
                        sha256: string;
                        id: string;
                    };
                    audio?: {
                        mime_type: string;
                        sha256: string;
                        id: string;
                    };
                    video?: {
                        caption?: string;
                        mime_type: string;
                        sha256: string;
                        id: string;
                    };
                }>;
                statuses?: Array<{
                    id: string;
                    status: string;
                    timestamp: string;
                    recipient_id: string;
                }>;
            };
            field: string;
        }>;
    }>;
}