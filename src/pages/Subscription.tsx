import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const PLANS = [
    {
        name: 'Starter',
        description: 'Perfect for small teams getting started.',
        monthlyPrice: 29,
        annualPrice: 290,
        priceIdMonthly: 'price_starter_monthly', // Replace with real Stripe Price ID
        priceIdAnnual: 'price_starter_annual',   // Replace with real Stripe Price ID
        features: [
            'Up to 5 salespeople',
            'Basic report templates',
            'Voice transcripts (100/mo)',
            'WhatsApp integration',
            'Email support',
        ],
    },
    {
        name: 'Pro',
        description: 'Advanced features for growing businesses.',
        monthlyPrice: 79,
        annualPrice: 790,
        priceIdMonthly: 'price_pro_monthly', // Replace with real Stripe Price ID
        priceIdAnnual: 'price_pro_annual',   // Replace with real Stripe Price ID
        popular: true,
        features: [
            'Up to 20 salespeople',
            'Unlimited report templates',
            'Unlimited voice transcripts',
            'Priority WhatsApp API',
            'Advanced analytics',
            '24/7 Priority support',
        ],
    },
    {
        name: 'Enterprise',
        description: 'Full-scale solution for large organizations.',
        monthlyPrice: 199,
        annualPrice: 1990,
        priceIdMonthly: 'price_enterprise_monthly', // Replace with real Stripe Price ID
        priceIdAnnual: 'price_enterprise_annual',   // Replace with real Stripe Price ID
        features: [
            'Unlimited salespeople',
            'Custom integrations',
            'Dedicated account manager',
            'SLA guarantees',
            'Audit logs & compliance',
            'Custom AI models',
        ],
    },
];

export default function Subscription() {
    const { user } = useAuth();
    const [isAnnual, setIsAnnual] = useState(false);
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    const handleSubscribe = async (plan: typeof PLANS[0]) => {
        if (!user) {
            toast.error('Please login to subscribe');
            return;
        }

        setLoadingPlan(plan.name);
        try {
            const priceId = isAnnual ? plan.priceIdAnnual : plan.priceIdMonthly;
            const planType = isAnnual ? 'annual' : 'monthly';

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.access_token || ''}`, // Depending on your auth setup
                },
                body: JSON.stringify({
                    price_id: priceId,
                    user_id: user.id,
                    plan_type: planType,
                }),
            });

            const { url, error } = await response.json();

            if (error) throw new Error(error);

            if (url) {
                window.location.href = url;
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to initiate checkout. Please check your Stripe logs.');
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="p-6 lg:p-8 pt-20 lg:pt-6 max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl mb-4">
                            Simple, transparent pricing
                        </h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto font-medium">
                            Choose the plan that's right for your business and start automating your sales reports today.
                        </p>

                        <div className="mt-10 flex items-center justify-center gap-4">
                            <span className={`text-sm font-semibold transition-colors ${!isAnnual ? 'text-gray-900' : 'text-gray-400'}`}>
                                Monthly
                            </span>
                            <button
                                onClick={() => setIsAnnual(!isAnnual)}
                                className="relative inline-flex h-6 w-11 items-center rounded-full bg-brand-primary-600 transition-colors focus:outline-none ring-2 ring-brand-primary-100 ring-offset-2"
                            >
                                <span
                                    className={`${isAnnual ? 'translate-x-6' : 'translate-x-1'
                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform ease-in-out duration-200`}
                                />
                            </button>
                            <span className={`text-sm font-semibold transition-colors ${isAnnual ? 'text-gray-900' : 'text-gray-400'}`}>
                                Annual <span className="text-green-600 text-xs ml-1">(Save 20%)</span>
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {PLANS.map((plan) => (
                            <Card
                                key={plan.name}
                                className={`flex flex-col relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 ${plan.popular ? 'border-brand-primary-600 ring-4 ring-brand-primary-50 shadow-lg' : 'border-gray-100'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-brand-primary-600 text-white text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1 shadow-md">
                                        <Sparkles className="w-3 h-3" />
                                        MOST POPULAR
                                    </div>
                                )}
                                <CardHeader className="pt-8 px-8">
                                    <div className="mb-4">
                                        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                                        <CardDescription className="mt-2 text-gray-500 min-h-[40px]">
                                            {plan.description}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-baseline gap-1 mt-2">
                                        <span className="text-5xl font-extrabold tracking-tight">
                                            ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                                        </span>
                                        <span className="text-gray-500 font-medium">/{isAnnual ? 'year' : 'month'}</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1 px-8">
                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        {plan.features.map((feature) => (
                                            <div key={feature} className="flex items-start gap-3">
                                                <div className="p-1 rounded-full bg-brand-primary-50 mt-0.5">
                                                    <Check className="w-4 h-4 text-brand-primary-600 shrink-0" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 leading-tight">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                                <CardFooter className="pb-8 px-8 flex justify-center mt-auto">
                                    <Button
                                        onClick={() => handleSubscribe(plan)}
                                        disabled={loadingPlan !== null}
                                        className={`w-full h-12 text-lg font-bold rounded-xl transition-all active:scale-95 ${plan.popular
                                                ? 'bg-brand-primary-600 hover:bg-brand-primary-700 text-white shadow-brand-primary-200'
                                                : 'bg-white border-2 border-brand-primary-600 text-brand-primary-600 hover:bg-brand-primary-50'
                                            }`}
                                    >
                                        {loadingPlan === plan.name ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <>
                                                <Zap className={`w-5 h-5 mr-2 ${plan.popular ? 'fill-white' : ''}`} />
                                                Subscribe Now
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-16 text-center text-gray-500 bg-white/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-100 shadow-sm max-w-3xl mx-auto">
                        <p className="text-sm font-medium italic">
                            All plans include free future updates, secure data encryption, and cross-platform syncing.
                            Billing occurs monthly or annually depending on your selection. Cancel anytime.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
