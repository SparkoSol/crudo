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
