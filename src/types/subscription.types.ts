export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';
export type BillingPeriod = 'monthly' | 'annual';
export type SubscriptionPlanType = SubscriptionTier;
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'unpaid';

export interface SubscriptionPlan {
    id: SubscriptionTier;
    name: string;
    price: number;
    annualPrice: number;
    description: string;
    features: string[];
    highlighted?: boolean;
}

export interface CreditPricingTier {
    range: string;
    pricePerCredit: string;
    highlighted?: boolean;
}

export interface CreditInfo {
    pricingTiers: CreditPricingTier[];
    typicalUsagePerReport: string;
    rolloverRules: string[];
}

export interface SubscriptionData {
    plan_type: SubscriptionPlanType;
    billing_period?: BillingPeriod;
    status: SubscriptionStatus;
    subscription_role?: string;
    updated_at?: string;
    [key: string]: any;
}

export interface SubscriptionDetails {
    next_billing_date: string | null;
    usage_credits: number;
}
