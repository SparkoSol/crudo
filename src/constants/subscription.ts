import type { SubscriptionPlan, CreditInfo, BillingPeriod, CreditPackage } from '@/types';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: 'starter',
        name: 'Starter',
        price: 79,
        annualPrice: 790,
        description: 'Para equipos pequeños que quieren empezar a registrar visitas sin fricciones.',
        features: [
            '1 empresa',
            '1 integración ERP',
            'Hasta 3 plantillas de informes',
            'WhatsApp Business + bot de IA',
            'Panel de visitas',
            'Historial de informes',
        ],
    },
    {
        id: 'professional',
        name: 'Profesional',
        price: 199,
        annualPrice: 1990,
        description: 'Para equipos de ventas activos que necesitan visibilidad y control.',
        highlighted: true,
        features: [
            'Todo lo de Starter, más:',
            'Plantillas ilimitadas',
            'Múltiples equipos y gerentes',
            'Analítica básica de visitas',
            'Exportaciones avanzadas',
            'Webhooks / API',
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 399,
        annualPrice: 3990,
        description: 'Para empresas que integran iNotus como parte crítica de su operación.',
        features: [
            'Todo lo de Profesional, más:',
            'Integración avanzada de ERP',
            'Roles y permisos',
            'SLA y soporte prioritario',
            'Onboarding asistido',
        ],
    },
];

export const ANNUAL_SAVINGS_PERCENT = Math.round(
    (1 - SUBSCRIPTION_PLANS[0].annualPrice / (SUBSCRIPTION_PLANS[0].price * 12)) * 100
);

export const CREDIT_INFO: CreditInfo = {
    pricingTiers: [
        { range: 'Hasta 1,000', pricePerCredit: '0,40 €' },
        { range: '1,000 – 5,000', pricePerCredit: '0,30 €', highlighted: true },
        { range: '5,000 – 20,000', pricePerCredit: '0,22 €' },
        { range: 'Enterprise', pricePerCredit: 'Desde 0,15 €' },
    ],
    typicalUsagePerReport: '2–3 créditos',
    rolloverRules: [
        'Los créditos no utilizados se acumulan automáticamente para el mes siguiente',
        'Puedes acumular hasta el 100% de los créditos comprados el mes pasado',
        'Tus créditos más antiguos siempre se utilizan primero',
    ],
};

export const TIER_LABELS: Record<string, string> = {
    starter: 'Starter',
    professional: 'Profesional',
    enterprise: 'Enterprise',
    monthly: 'Mensual Antiguo',
    annual: 'Anual Antiguo',
};

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
    monthly: 'Mensual',
    annual: 'Anual',
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
        name: 'Básico',
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
        name: 'Crecimiento',
        credits: 1000,
        price: 300,
        pricePerCredit: 0.30,
        savingsPercent: 25,
        highlighted: true,
    },
    {
        id: 'pack_3000',
        name: 'Negocios',
        credits: 3000,
        price: 750,
        pricePerCredit: 0.25,
        savingsPercent: 38,
    },
    {
        id: 'pack_5000',
        name: 'Escala',
        credits: 5000,
        price: 1100,
        pricePerCredit: 0.22,
        savingsPercent: 45,
    },
];
