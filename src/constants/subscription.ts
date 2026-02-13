import type { SubscriptionPlan, CreditInfo, BillingPeriod, CreditPackage } from '@/types';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: 'starter',
        name: 'Starter',
        price: 79,
        annualPrice: 790,
        description: 'For small teams that want to start recording visits without friction.',
        features: [
            '1 company',
            '1 ERP integration',
            'Up to 3 report templates',
            'WhatsApp Business + AI bot',
            'Visits dashboard',
            'Report history',
        ],
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 199,
        annualPrice: 1990,
        description: 'For active sales teams that need visibility and control.',
        highlighted: true,
        features: [
            'Everything in Starter, plus:',
            'Unlimited templates',
            'Multiple teams and managers',
            'Basic visit analytics',
            'Advanced exports',
            'Webhooks / API',
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 399,
        annualPrice: 3990,
        description: 'For companies that integrate iNotus as a critical part of their operation.',
        features: [
            'Everything in Professional, plus:',
            'Advanced ERP integration',
            'Roles and permissions',
            'SLA and priority support',
            'Assisted onboarding',
        ],
    },
];

export const ANNUAL_SAVINGS_PERCENT = Math.round(
    (1 - SUBSCRIPTION_PLANS[0].annualPrice / (SUBSCRIPTION_PLANS[0].price * 12)) * 100
);

export const CREDIT_INFO: CreditInfo = {
    pricingTiers: [
        { range: 'Up to 1,000', pricePerCredit: '€0.40' },
        { range: '1,000 – 5,000', pricePerCredit: '€0.30', highlighted: true },
        { range: '5,000 – 20,000', pricePerCredit: '€0.22' },
        { range: 'Enterprise', pricePerCredit: 'From €0.15' },
    ],
    typicalUsagePerReport: '2–3 credits',
    rolloverRules: [
        'Unused credits automatically carry over to the next month',
        'You can carry over up to 100% of your last month\'s purchased credits',
        'Your oldest credits are always used first',
    ],
};

export const TIER_LABELS: Record<string, string> = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
    monthly: 'Legacy Monthly',
    annual: 'Legacy Annual',
};

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
    monthly: 'Monthly',
    annual: 'Annual',
};

export const CREDIT_PACKAGES: CreditPackage[] = [
    {
        id: 'pack_50',
        name: 'Mini',
        credits: 50,
        price: 19,
        pricePerCredit: 0.38,
        savingsPercent: 5,
    },
    {
        id: 'pack_100',
        name: 'Basic',
        credits: 100,
        price: 36,
        pricePerCredit: 0.36,
        savingsPercent: 10,
    },
    {
        id: 'pack_500',
        name: 'Starter',
        credits: 500,
        price: 175,
        pricePerCredit: 0.35,
        savingsPercent: 12,
    },
    {
        id: 'pack_1000',
        name: 'Growth',
        credits: 1000,
        price: 300,
        pricePerCredit: 0.30,
        savingsPercent: 25,
        highlighted: true,
    },
    {
        id: 'pack_3000',
        name: 'Business',
        credits: 3000,
        price: 750,
        pricePerCredit: 0.25,
        savingsPercent: 38,
    },
    {
        id: 'pack_5000',
        name: 'Scale',
        credits: 5000,
        price: 1100,
        pricePerCredit: 0.22,
        savingsPercent: 45,
    },
];
