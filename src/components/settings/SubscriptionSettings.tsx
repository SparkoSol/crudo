import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Zap, CreditCard, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface SubscriptionSettingsProps {
    initialSubscription?: any;
    initialDetails?: { next_billing_date: string | null, usage_credits: number } | null;
}

export function SubscriptionSettings({ initialSubscription, initialDetails }: SubscriptionSettingsProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(!initialSubscription);
    const [subscription, setSubscription] = useState<any>(initialSubscription || null);
    const [details, setDetails] = useState<{ next_billing_date: string | null, usage_credits: number }>(
        initialDetails || { next_billing_date: null, usage_credits: 0 }
    );
    const [cancelLoading, setCancelLoading] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    useEffect(() => {
        if (!user) return;

        if (initialSubscription) {
            setSubscription(initialSubscription);
            if (initialDetails) setDetails(initialDetails);
            setLoading(false);
            return;
        }

        const fetchSub = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .in('status', ['active', 'trialing', 'past_due'])
                .order('updated_at', { ascending: false })
                .maybeSingle();

            if (data) {
                setSubscription(data);
                try {
                    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-subscription-details`, {
                        headers: {
                            'Authorization': `Bearer ${user.access_token}`,
                        },
                    });
                    const detailData = await response.json();
                    if (detailData.next_billing_date) {
                        setDetails({
                            next_billing_date: detailData.next_billing_date,
                            usage_credits: detailData.usage_credits || 0
                        });
                    }
                } catch (err) {
                    console.error("Failed to fetch subscription details", err);
                }
            }
            setLoading(false);
        };
        fetchSub();
    }, [user, initialSubscription, initialDetails]);

    const handleCancel = () => {
        setShowCancelDialog(true);
    };

    const executeCancellation = async () => {
        setCancelLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.access_token || ''}`,
                },
            });

            const result = await response.json();
            if (response.ok) {
                toast.success("Subscription canceled successfully");
                setSubscription({ ...subscription, status: 'canceled' });
                setShowCancelDialog(false);
            } else {
                throw new Error(result.error || "Failed to cancel subscription");
            }

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
                            <p className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                {details.usage_credits}
                                <span className="text-sm font-normal text-gray-500">used</span>
                                <CreditCard className="h-5 w-5 text-orange-500" />
                            </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Usage is calculated monthly. You are billed for {details.usage_credits} credits.</p>
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
