export interface InviteSalesRepresentativeData {
    email: string;
    fullName: string;
    phoneNumber?: string | null;
    templateId: string;
    managerId: string;
    managerFullName: string | null;
    managerCompanyName?: string | null;
}

export interface InviteResponse {
    userId: string;
    email: string;
    password: string;
}
