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

export interface CreditBatch {
    id: string;
    manager_id: string;
    credits_purchased: number;
    credits_remaining: number;
    source: 'purchase' | 'rollover';
    cycle_month: string;
    stripe_session_id: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    pricePerCredit: number;
    savingsPercent: number;
    highlighted?: boolean;
}
