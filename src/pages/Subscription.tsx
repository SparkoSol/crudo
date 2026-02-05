import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Loader2, Zap, CreditCard, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Subscription() {
    const { user } = useAuth();
    const [isAnnual, setIsAnnual] = useState(false);
    const [loading, setLoading] = useState(false);

    const PLAN = {
        name: 'Platform Access',
        description: 'Complete sales reporting and management suite.',
        monthlyPrice: 10,
        annualPrice: 120,
        creditPrice: 5,
        features: [
            'Sales Reporting Dashboard',
            'Team Management & Roles',
            'Unlimited Historical Data',
            'Export to CSV/PDF',
            'Priority Email Support'
        ],
    };

    const handleSubscribe = async () => {
        if (!user) {
            toast.error('Please login to subscribe');
            return;
        }

        setLoading(true);
        try {
            const planType = isAnnual ? 'annual' : 'monthly';

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.access_token || ''}`,
                },
                body: JSON.stringify({
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
            toast.error(err instanceof Error ? err.message : 'Failed to initiate checkout');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900">
            <Sidebar />
            <main className="flex-1 overflow-y-auto lg:ml-0">
                <div className="p-6 lg:p-8 pt-20 lg:pt-6 max-w-7xl mx-auto">

                    {/* Consistent Header Section */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription</h1>
                        <p className="text-gray-600">
                            Manage your plan and billing details
                        </p>
                    </div>

                    <div className="max-w-5xl mx-auto">

                        {/* Billing Toggle */}
                        <div className="flex justify-center mb-10">
                            <div className="bg-gray-100 p-1 rounded-xl inline-flex items-center gap-1 shadow-inner">
                                <button
                                    onClick={() => setIsAnnual(false)}
                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${!isAnnual
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setIsAnnual(true)}
                                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${isAnnual
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    Annual
                                    <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                                        -20%
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                            {/* Main Subscription Card */}
                            <Card className="lg:col-span-2 border border-gray-200 shadow-lg bg-white overflow-hidden rounded-2xl">
                                <CardHeader className="p-8 pb-0">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-2xl font-bold text-gray-900">{PLAN.name}</CardTitle>
                                            <CardDescription className="text-gray-500 mt-2 text-base">
                                                {PLAN.description}
                                            </CardDescription>
                                        </div>
                                        <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                            <Zap className="h-6 w-6 text-brand-primary-600" />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex items-baseline gap-1">
                                        <span className="text-5xl font-extrabold text-gray-900 tracking-tight">
                                            €{isAnnual ? PLAN.annualPrice : PLAN.monthlyPrice}
                                        </span>
                                        <span className="text-gray-500 text-lg">
                                            / {isAnnual ? 'year' : 'month'}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 pt-6">
                                    <div className="h-px w-full bg-gray-100 mb-6"></div>
                                    <ul className="space-y-4">
                                        {PLAN.features.map((feature, i) => (
                                            <li key={i} className="flex items-center gap-3">
                                                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                                    <Check className="h-3 w-3 text-green-600" />
                                                </div>
                                                <span className="text-gray-700">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter className="p-8 pt-0 bg-gray-50/50 mt-auto border-t border-gray-100">
                                    <div className="w-full pt-6">
                                        <Button
                                            onClick={handleSubscribe}
                                            disabled={loading}
                                            className="w-full h-12 text-base font-semibold bg-brand-primary-600 hover:bg-brand-primary-700 text-white rounded-lg shadow-md transition-all"
                                        >
                                            {loading ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    Subscribe Now
                                                    <ChevronRight className="ml-2 h-4 w-4" />
                                                </>
                                            )}
                                        </Button>
                                        <p className="text-xs text-center text-gray-400 mt-4">
                                            Secure payments via Stripe. Cancel anytime in your dashboard.
                                        </p>
                                    </div>
                                </CardFooter>
                            </Card>

                            {/* Metered Credits Card */}
                            <Card className="border border-gray-200 shadow-md bg-white rounded-2xl h-full flex flex-col">
                                <CardHeader className="p-6">
                                    <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
                                        <CreditCard className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-gray-900">Metered Credits</CardTitle>
                                    <CardDescription className="text-gray-500">
                                        Additional usage on demand
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 pt-2 flex-1">
                                    <div className="flex items-baseline gap-1 mb-4">
                                        <span className="text-3xl font-bold text-gray-900">€{PLAN.creditPrice}</span>
                                        <span className="text-gray-500">/ credit</span>
                                    </div>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Credits are billed automatically at the end of each cycle based on your actual consumption.
                                    </p>
                                    <div className="mt-6 space-y-3">
                                        <div className="flex items-start gap-2.5">
                                            <Check className="w-4 h-4 text-orange-500 mt-0.5" />
                                            <span className="text-sm text-gray-600">Pay only for what you use</span>
                                        </div>
                                        <div className="flex items-start gap-2.5">
                                            <Check className="w-4 h-4 text-orange-500 mt-0.5" />
                                            <span className="text-sm text-gray-600">No expiration on credits</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <div className="p-4 bg-orange-50/50 border-t border-orange-100 rounded-b-2xl">
                                    <p className="text-xs text-orange-700 text-center font-medium">
                                        Included automatically with your plan
                                    </p>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
