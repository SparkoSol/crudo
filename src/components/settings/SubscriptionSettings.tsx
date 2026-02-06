import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Zap, CreditCard, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { subscriptionService } from '@/services/subscriptionService';
import type { SubscriptionData, SubscriptionDetails, CreditsWallet } from '@/types';

interface SubscriptionSettingsProps {
    initialSubscription?: SubscriptionData | null;
    initialDetails?: SubscriptionDetails | null;
    initialWallet?: CreditsWallet | null;
}

export function SubscriptionSettings({ initialSubscription, initialDetails, initialWallet }: SubscriptionSettingsProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(!initialSubscription);
    const [subscription, setSubscription] = useState<SubscriptionData | null>(initialSubscription || null);
    const [details, setDetails] = useState<SubscriptionDetails>(
        initialDetails || { next_billing_date: null, usage_credits: 0 }
    );
    const [wallet, setWallet] = useState<CreditsWallet | null>(initialWallet || null);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    useEffect(() => {
        if (!user) return;

        if (initialSubscription) {
            setSubscription(initialSubscription);
            if (initialDetails) setDetails(initialDetails);
            if (initialWallet) setWallet(initialWallet);
            setLoading(false);
            return;
        }

        const fetchSub = async () => {
            setLoading(true);
            try {
                const subData = await subscriptionService.getUserSubscription(user.id);
                if (subData) {
                    setSubscription(subData);
                    const [detailData, walletData] = await Promise.all([
                        subscriptionService.getSubscriptionDetails(),
                        import('@/services/creditService').then(m => m.creditService.getWallet())
                    ]);
                    setDetails(detailData);
                    setWallet(walletData);
                }
            } catch (err) {
                console.error("Failed to fetch subscription data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSub();
    }, [user, initialSubscription, initialDetails, initialWallet]);

    const handleCancel = () => {
        setShowCancelDialog(true);
    };

    const executeCancellation = async () => {
        if (!user) return;
        setCancelLoading(true);
        try {
            await subscriptionService.cancelSubscription();
            toast.success("Subscription canceled successfully");
            if (subscription) {
                setSubscription({ ...subscription, status: 'canceled' });
            }
            setShowCancelDialog(false);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to cancel subscription");
        } finally {
            setCancelLoading(false);
        }
    };

    if (loading) return (
        <Card className="border-gray-200 shadow-sm animate-pulse">
            <CardHeader className="h-24 bg-gray-100 rounded-t-xl" />
            <CardContent className="h-40 bg-gray-50" />
        </Card>
    );

    if (!subscription) {
        return (
            <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Zap className="h-5 w-5 text-gray-500" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Subscription</CardTitle>
                            <CardDescription>You are currently on the Free plan.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600 mb-4">Upgrade to Platform Access to unlock premium features and metered credits.</p>
                    <Button onClick={() => navigate('/subscription')} className="bg-brand-primary-600 hover:bg-brand-primary-700">
                        View Plans
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-primary-100 rounded-lg">
                            <Zap className="h-5 w-5 text-brand-primary-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Subscription & Billing</CardTitle>
                            <CardDescription>Manage your current plan and usage</CardDescription>
                        </div>
                    </div>
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${subscription.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                        {subscription.status}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Current Plan</p>
                            <p className="text-lg font-bold text-gray-900 capitalize flex items-center gap-2">
                                {subscription.plan_type}
                                <span className="text-sm font-normal text-gray-500">({subscription.subscription_role})</span>
                            </p>
                        </div>
                        {details.next_billing_date && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Next Billing Date</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {new Date(details.next_billing_date).toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Credits Usage</p>
                            <div className="flex items-end gap-2">
                                <p className="text-2xl font-bold text-gray-900">
                                    {wallet ? wallet.used_credits_this_month : details.usage_credits}
                                </p>
                                <p className="text-sm font-normal text-gray-500 mb-1">used this month</p>
                                <CreditCard className="h-5 w-5 text-orange-500 mb-1 ml-auto" />
                            </div>
                            {wallet && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Total used: {wallet.used_credits} credits
                                </p>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Usage is calculated monthly. You are billed for {wallet ? wallet.used_credits_this_month : details.usage_credits} credits.
                        </p>
                    </div>
                </div>

                {subscription.status === 'past_due' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                        <AlertTriangle className="h-4 w-4" />
                        <span>There is an issue with your payment method. Please update it.</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-4 border-t border-gray-100 flex justify-between bg-gray-50/50">
                <p className="text-xs text-gray-500">
                    To upgrade or change your plan, visit the <a href="/subscription" className="text-brand-primary-600 hover:underline">Subscription page</a>.
                </p>
                {subscription.status !== 'canceled' && (
                    <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={cancelLoading}
                        className="gap-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                    >
                        {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                        Cancel Plan
                    </Button>
                )}
            </CardFooter>

            <ConfirmationDialog
                open={showCancelDialog}
                onOpenChange={setShowCancelDialog}
                onConfirm={executeCancellation}
                title="Cancel Subscription"
                description="Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your current billing period."
                confirmText="Yes, cancel plan"
                cancelText="Keep my plan"
                variant="destructive"
                isLoading={cancelLoading}
            />
        </Card>
    );
}
