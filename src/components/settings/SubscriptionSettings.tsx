import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Zap, CreditCard, ExternalLink, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function SubscriptionSettings() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [subscription, setSubscription] = useState<any>(null);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetchSub = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .in('status', ['active', 'trialing', 'past_due'])
                .order('updated_at', { ascending: false })
                .maybeSingle();

            if (data) setSubscription(data);
            setLoading(false);
        };
        fetchSub();
    }, [user]);

    const handlePortal = async () => {
        setPortalLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.access_token || ''}`,
                },
                body: JSON.stringify({
                    return_url: window.location.href,
                }),
            });

            const { url, error } = await response.json();
            if (error) throw new Error(error);
            if (url) window.location.href = url;

        } catch (err: any) {
            console.error(err);
            toast.error("Failed to load billing portal. Please try again.");
        } finally {
            setPortalLoading(false);
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
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Current Plan</p>
                        <p className="text-lg font-bold text-gray-900 capitalize flex items-center gap-2">
                            {subscription.plan_type}
                            <span className="text-sm font-normal text-gray-500">({subscription.subscription_role})</span>
                        </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Credits</p>
                        <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            Metered
                            <CreditCard className="h-4 w-4 text-orange-500" />
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Usage is calculated monthly</p>
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
                    Next billing and usage details available in portal.
                </p>
                <Button
                    variant="outline"
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="gap-2"
                >
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    Manage Subscription & Usage
                </Button>
            </CardFooter>
        </Card>
    );
}
