import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { signOut } from '@/services/authServices';
import { Check, Loader2, Zap, ChevronRight, LogIn, Coins, ArrowRight, RotateCcw, TrendingDown, ShoppingCart, Package, Shield, Star, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { SUBSCRIPTION_PLANS, CREDIT_INFO, ANNUAL_SAVINGS_PERCENT, CREDIT_PACKAGES } from '@/constants/subscription';
import { subscriptionService } from '@/services/subscriptionService';
import { creditService } from '@/services/creditService';
import type { SubscriptionData, SubscriptionTier, BillingPeriod, CreditsWallet, CreditBatch } from '@/types';

export default function Subscription() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
    const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
    const [wallet, setWallet] = useState<CreditsWallet | null>(null);
    const [batches, setBatches] = useState<CreditBatch[]>([]);

    const handleLoginRedirect = async () => {
        try {
            await signOut();
            navigate('/auth/login');
        } catch (error) {
            console.error('Logout failed:', error);
            navigate('/auth/login');
        }
    };

    useEffect(() => {
        if (!user) return;
        const fetchSub = async () => {
            try {
                const data = await subscriptionService.getUserSubscription(user.id);
                setSubscription(data);
                if (data?.billing_period) {
                    setBillingPeriod(data.billing_period);
                }
            } catch (err) {
                console.error('Failed to fetch subscription:', err);
            }
        };
        const fetchCredits = async () => {
            try {
                const [walletData, batchesData] = await Promise.all([
                    creditService.getWallet(),
                    creditService.getBatches(),
                ]);
                setWallet(walletData);
                setBatches(batchesData);
            } catch (err) {
                console.error('Failed to fetch credits:', err);
            }
        };
        fetchSub();
        fetchCredits();
    }, [user]);

    const remainingCredits = batches.reduce((sum, b) => sum + b.credits_remaining, 0) || (wallet?.total_credits ?? 0);

    const handleSubscribe = async (tier: SubscriptionTier) => {
        if (!user) {
            toast.error('Please login to subscribe');
            return;
        }

        setLoadingTier(tier);
        try {
            const { url } = await subscriptionService.createCheckoutSession({
                userId: user.id,
                email: user.email || '',
                planType: tier,
                billingPeriod,
            });

            if (url) {
                window.location.href = url;
            }
        } catch (err: unknown) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Failed to initiate checkout');
        } finally {
            setLoadingTier(null);
        }
    };

    const isCurrentPlan = (tier: SubscriptionTier) =>
        subscription?.plan_type === tier &&
        (subscription?.billing_period || 'monthly') === billingPeriod &&
        subscription?.status === 'active';

    const handleBuyPack = async (packId: string) => {
        if (!user) {
            toast.error('Please login to purchase credits');
            return;
        }

        setLoadingPackId(packId);
        try {
            const { url } = await creditService.purchaseCreditPack(packId);
            if (url) {
                window.location.href = url;
            }
        } catch (err: unknown) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : 'Failed to start checkout');
        } finally {
            setLoadingPackId(null);
        }
    };

    const getButtonLabel = (tier: SubscriptionTier) => {
        if (isCurrentPlan(tier)) return 'Current Plan';
        if (subscription?.status === 'active') return 'Switch Plan';
        return 'Get Started';
    };

    const getDisplayPrice = (plan: typeof SUBSCRIPTION_PLANS[0]) => {
        if (billingPeriod === 'annual') {
            return Math.round(plan.annualPrice / 12);
        }
        return plan.price;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50/50 text-gray-900">
            {/* Hero Header */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-primary-50/80 via-white to-brand-primary-50/40" />
                <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-brand-primary-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] bg-brand-primary-100/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

                <div className="relative px-4 sm:px-6 lg:px-8 pt-10 sm:pt-12 lg:pt-10 pb-8 sm:pb-12 max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8 sm:mb-10">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary-100/60 text-brand-primary-700 text-xs font-semibold mb-4">
                                <Sparkles className="h-3.5 w-3.5" />
                                Flexible pricing for every team
                            </div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-2 sm:mb-3">
                                Choose your plan
                            </h1>
                            <p className="text-base sm:text-lg text-gray-500 leading-relaxed">
                                Pay a fixed platform fee, then only for the visits you actually record. No hidden costs.
                            </p>
                        </div>
                        {user ? (
                            <div className="relative group self-start" aria-label={`${remainingCredits} remaining credits`}>
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm cursor-default transition-all duration-200 group-hover:border-amber-300 group-hover:shadow-md group-hover:shadow-amber-100/50">
                                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                        <Coins className="h-4 w-4 text-amber-600" />
                                    </div>
                                    {wallet === null && batches.length === 0 ? (
                                        <Skeleton className="h-5 w-10 rounded-md" />
                                    ) : (
                                        <span className="text-lg font-bold text-gray-900">{remainingCredits.toLocaleString()}</span>
                                    )}
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
                                    Remaining credits
                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                                </div>
                            </div>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={handleLoginRedirect}
                                className="gap-2 text-gray-600 hover:text-brand-primary-600 hover:bg-brand-primary-50 hover:border-brand-primary-200 transition-all duration-200 rounded-xl self-start"
                            >
                                <LogIn className="h-4 w-4" />
                                Login
                            </Button>
                        )}
                    </div>

                    {/* Billing Period Toggle */}
                    <div className="flex justify-center">
                        <div className="inline-flex items-center bg-white/80 backdrop-blur-sm rounded-full p-1 sm:p-1.5 gap-1 shadow-sm border border-gray-200/60">
                            <button
                                onClick={() => setBillingPeriod('monthly')}
                                className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                                    billingPeriod === 'monthly'
                                        ? 'bg-brand-primary-600 text-white shadow-md shadow-brand-primary-200/50'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingPeriod('annual')}
                                className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 ${
                                    billingPeriod === 'annual'
                                        ? 'bg-brand-primary-600 text-white shadow-md shadow-brand-primary-200/50'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                Annual
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors duration-300 ${
                                    billingPeriod === 'annual'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-green-100 text-green-700'
                                }`}>
                                    Save {ANNUAL_SAVINGS_PERCENT}%
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2">
                {/* Tier Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-16">
                    {SUBSCRIPTION_PLANS.map((plan) => (
                        <Card
                            key={plan.id}
                            className={`relative border bg-white overflow-hidden rounded-2xl flex flex-col transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${
                                plan.highlighted
                                    ? 'border-brand-primary-300 shadow-xl shadow-brand-primary-100/50 ring-1 ring-brand-primary-100'
                                    : 'border-gray-200 shadow-lg hover:shadow-xl hover:border-gray-300'
                            }`}
                        >
                            {plan.highlighted && (
                                <>
                                    <div className="h-1 bg-gradient-to-r from-brand-primary-400 via-brand-primary-600 to-brand-primary-400" />
                                    <div className="absolute top-1 left-1/2 -translate-x-1/2">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-brand-primary-600 text-white px-3 py-1 rounded-full uppercase tracking-wider shadow-md shadow-brand-primary-200/50">
                                            <Star className="h-3 w-3 fill-current" />
                                            Most Popular
                                        </span>
                                    </div>
                                </>
                            )}
                            <CardHeader className={`p-4 sm:p-6 ${plan.highlighted ? 'pt-8 sm:pt-10' : 'pt-4 sm:pt-6'}`}>
                                <div className="flex items-center gap-2.5 mb-1">
                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                                        plan.highlighted
                                            ? 'bg-brand-primary-100 text-brand-primary-600'
                                            : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-gray-900">{plan.name}</CardTitle>
                                </div>
                                <CardDescription className="text-gray-500 text-sm min-h-[40px]">
                                    {plan.description}
                                </CardDescription>
                                <div className="mt-4 sm:mt-5">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
                                            €{getDisplayPrice(plan)}
                                        </span>
                                        <span className="text-gray-400 text-base font-medium">
                                            /month
                                        </span>
                                    </div>
                                    {billingPeriod === 'annual' && (
                                        <p className="text-xs text-gray-400 mt-1.5">
                                            Billed as €{plan.annualPrice.toLocaleString()} per year
                                        </p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 pt-0 flex-1">
                                <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-5" />
                                <ul className="space-y-3">
                                    {plan.features.map((feature, i) => {
                                        const isHeader = feature.endsWith(':');
                                        return (
                                            <li key={i} className="flex items-start gap-2.5">
                                                {!isHeader && (
                                                    <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                                        plan.highlighted
                                                            ? 'bg-brand-primary-100 text-brand-primary-600'
                                                            : 'bg-green-100 text-green-600'
                                                    }`}>
                                                        <Check className="h-3 w-3" />
                                                    </div>
                                                )}
                                                <span className={`text-sm ${
                                                    isHeader
                                                        ? 'text-brand-primary-600 font-semibold'
                                                        : 'text-gray-600'
                                                }`}>
                                                    {feature}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </CardContent>
                            <CardFooter className="p-4 sm:p-6 pt-0 mt-auto">
                                <div className="w-full space-y-3">
                                    <Button
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={loadingTier !== null || isCurrentPlan(plan.id)}
                                        className={`w-full h-12 text-sm font-semibold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                            plan.highlighted
                                                ? 'bg-brand-primary-600 hover:bg-brand-primary-700 text-white shadow-md shadow-brand-primary-200/40 hover:shadow-lg hover:shadow-brand-primary-200/50'
                                                : 'bg-gray-900 hover:bg-gray-800 text-white hover:shadow-md'
                                        }`}
                                    >
                                        {loadingTier === plan.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                {getButtonLabel(plan.id)}
                                                {!isCurrentPlan(plan.id) && <ChevronRight className="ml-1.5 h-4 w-4" />}
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-[11px] text-center text-gray-400">
                                        Credits not included
                                    </p>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {/* Section Divider */}
                <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-12">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">Usage Credits</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                </div>

                {/* Credits Section */}
                <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden mb-10 sm:mb-16">
                    <div className="h-1 bg-gradient-to-r from-orange-300 via-orange-500 to-amber-400" />
                    <div className="p-4 sm:p-6 lg:p-8">
                        <div className="flex items-start gap-3 mb-5 sm:mb-6">
                            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shadow-sm flex-shrink-0">
                                <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Usage Credits</h2>
                                <p className="text-xs sm:text-sm text-gray-500">You only pay for the visits you actually process. The more you use, the less you pay per credit</p>
                            </div>
                        </div>

                        {/* Volume Pricing Table */}
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                            <div className="grid grid-cols-2 bg-gray-50/80 border-b border-gray-200">
                                <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Volume</div>
                                <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Price per Credit</div>
                            </div>
                            {CREDIT_INFO.pricingTiers.map((tier, i) => (
                                <div
                                    key={i}
                                    className={`grid grid-cols-2 border-b border-gray-100 last:border-b-0 transition-all duration-200 ${
                                        tier.highlighted
                                            ? 'bg-orange-50/60 hover:bg-orange-50'
                                            : 'bg-white hover:bg-gray-50/80'
                                    }`}
                                >
                                    <div className="px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-1.5 sm:gap-2.5">
                                        {tier.highlighted && (
                                            <TrendingDown className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                        )}
                                        <span className={`text-sm ${
                                            tier.highlighted ? 'font-semibold text-gray-900' : 'text-gray-700'
                                        }`}>
                                            {tier.range}
                                        </span>
                                        {tier.highlighted && (
                                            <span className="hidden sm:inline-flex text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                Popular
                                            </span>
                                        )}
                                    </div>
                                    <div className="px-3 sm:px-5 py-3 sm:py-4 text-right">
                                        <span className={`text-sm font-bold ${
                                            tier.highlighted ? 'text-orange-700' : 'text-gray-900'
                                        }`}>
                                            {tier.pricePerCredit}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 mt-5 sm:mt-6">
                            {/* How It Works */}
                            <div className="p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors duration-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-7 w-7 rounded-lg bg-gray-200/60 flex items-center justify-center">
                                        <ArrowRight className="h-3.5 w-3.5 text-gray-600" />
                                    </div>
                                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">How it works</span>
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Credits are used each time iNotus processes a visit report. This includes transcribing, organizing, and sending data to your ERP.
                                </p>
                                <p className="text-sm text-gray-500 mt-2">
                                    A sales report typically uses <strong className="text-gray-700">{CREDIT_INFO.typicalUsagePerReport}</strong>, depending on complexity. You'll receive a usage invoice at the end of each month.
                                </p>
                            </div>

                            {/* Unused Credits */}
                            <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50/80 to-white rounded-xl border border-blue-100 hover:border-blue-200 transition-colors duration-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-7 w-7 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
                                    </div>
                                    <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Unused Credits</span>
                                </div>
                                <ul className="space-y-2.5">
                                    {CREDIT_INFO.rolloverRules.map((rule, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Check className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-sm text-gray-600">{rule}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section Divider */}
                <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-12">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">Credit Packs</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                </div>

                {/* Prepaid Credit Packs */}
                <div id="credit-packs" className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden mb-8 sm:mb-12">
                    <div className="h-1 bg-gradient-to-r from-green-300 via-emerald-500 to-green-400" />
                    <div className="p-4 sm:p-6 lg:p-8">
                        <div className="flex items-start gap-3 mb-2">
                            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-sm flex-shrink-0">
                                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Prepaid Credit Packs</h2>
                                <p className="text-xs sm:text-sm text-gray-500">Buy credits upfront at a discounted rate. Prepaid credits are used first, and unused credits roll over each month</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
                            {CREDIT_PACKAGES.map((pack) => (
                                <div
                                    key={pack.id}
                                    className={`relative rounded-xl border p-4 sm:p-5 flex flex-col transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 ${
                                        pack.highlighted
                                            ? 'border-green-300 bg-gradient-to-br from-green-50/60 to-emerald-50/30 ring-1 ring-green-200 shadow-md shadow-green-100/50 hover:shadow-lg hover:shadow-green-100/60'
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                                    }`}
                                >
                                    {pack.highlighted && (
                                        <div className="absolute -top-2.5 left-4">
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-green-600 text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                                                <Star className="h-2.5 w-2.5 fill-current" />
                                                Best Value
                                            </span>
                                        </div>
                                    )}
                                    <div className="mb-3">
                                        <p className="text-sm font-semibold text-gray-900">{pack.name}</p>
                                        <p className="text-2xl font-extrabold text-gray-900 mt-1">
                                            {pack.credits.toLocaleString()}
                                            <span className="text-sm font-normal text-gray-400 ml-1">credits</span>
                                        </p>
                                    </div>
                                    <div className="flex items-baseline gap-1.5 mb-1">
                                        <span className="text-lg font-bold text-gray-900">€{pack.price.toLocaleString()}</span>
                                        <span className="text-xs text-gray-400">€{pack.pricePerCredit.toFixed(2)}/credit</span>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-fit mb-4 ${
                                        pack.highlighted
                                            ? 'text-green-700 bg-green-100'
                                            : 'text-green-700 bg-green-50'
                                    }`}>
                                        Save {pack.savingsPercent}%
                                    </span>
                                    <Button
                                        onClick={() => handleBuyPack(pack.id)}
                                        disabled={loadingPackId !== null}
                                        className={`w-full mt-auto h-10 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                            pack.highlighted
                                                ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-200/50 hover:shadow-md hover:shadow-green-200/60'
                                                : 'bg-gray-900 hover:bg-gray-800 text-white hover:shadow-sm'
                                        }`}
                                    >
                                        {loadingPackId === pack.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                                                Buy Now
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <p className="text-[10px] sm:text-xs text-gray-400 mt-4 sm:mt-6 text-center">
                            Prepaid credits are used before pay-as-you-go billing. Unused credits carry over each month (up to 100% of your last purchase).
                        </p>
                    </div>
                </div>

                {/* Trust Footer */}
                <div className="pb-8 sm:pb-12">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 py-4 sm:py-6">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Shield className="h-4 w-4" />
                            <span className="text-xs font-medium">Secure payments via Stripe</span>
                        </div>
                        <div className="hidden sm:block h-4 w-px bg-gray-200" />
                        <div className="flex items-center gap-2 text-gray-400">
                            <RotateCcw className="h-4 w-4" />
                            <span className="text-xs font-medium">Cancel anytime from Settings</span>
                        </div>
                        <div className="hidden sm:block h-4 w-px bg-gray-200" />
                        <div className="flex items-center gap-2 text-gray-400">
                            <Zap className="h-4 w-4" />
                            <span className="text-xs font-medium">No long-term commitment</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
