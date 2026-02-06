export type SubscriptionPlanType = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid';

export interface SubscriptionData {
    plan_type: SubscriptionPlanType;
    status: SubscriptionStatus;
    subscription_role?: string;
    updated_at?: string;
    [key: string]: any;
}

export interface SubscriptionDetails {
    next_billing_date: string | null;
    usage_credits: number;
}
