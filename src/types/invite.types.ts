export interface InviteSalesRepresentativeData {
    email: string;
    managerId: string;
    managerFullName: string | null;
    managerCompanyName?: string | null;
}

export interface InviteResponse {
    userId: string;
    email: string;
    password: string;
}
