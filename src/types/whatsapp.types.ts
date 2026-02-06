export interface WhatsAppSendRequest {
    messaging_product: string;
    recipient_type?: string;
    to: string;
    type?: "text" | "template" | "interactive";
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
            parameters?: Array<{
                type: string;
                text: string;
            }>;
            sub_type?: string;
            index?: string;
            buttons?: Array<{
                type: string;
                text?: string;
                url?: string;
            }>;
        }>;
    };
    interactive?: {
        type: "button" | "list" | "product" | "product_list";
        body: {
            text: string;
        };
        footer?: {
            text: string;
        };
        header?: {
            type: "text" | "image" | "video" | "document";
            text?: string;
            image?: {
                link: string;
            };
            video?: {
                link: string;
            };
            document?: {
                link: string;
                filename: string;
            };
        };
        action: {
            buttons?: Array<{
                type: "reply";
                reply: {
                    id: string;
                    title: string;
                };
            }>;
            sections?: Array<{
                title?: string;
                rows: Array<{
                    id: string;
                    title: string;
                    description?: string;
                }>;
            }>;
        };
    };
    // Convenience properties for client-side usage
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
                    voice?: {
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
                    interactive?: {
                        type: string;
                        button_reply?: {
                            id: string;
                            title: string;
                        };
                        list_reply?: {
                            id: string;
                            title: string;
                            description?: string;
                        };
                    };
                    context?: {
                        from: string;
                        id: string;
                        referred_product?: {
                            catalog_id: string;
                            product_retailer_id: string;
                        };
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