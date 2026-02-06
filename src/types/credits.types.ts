export interface CreditsWallet {
    manager_id: string;
    total_credits: number;
    used_credits: number;
    used_credits_this_month: number;
    billing_cycle_anchor: string | null;
    updated_at: string;
}

export interface CreditTransaction {
    id: string;
    manager_id: string;
    sales_rep_id: string;
    amount: number;
    reason: string | null;
    created_at: string;
}
