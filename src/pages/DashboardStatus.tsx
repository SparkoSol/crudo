import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionService } from '@/services/subscriptionService';
import type { SubscriptionData } from '@/types';

export default function DashboardStatus() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const sessionId = searchParams.get('session_id');
    const { user } = useAuth();
    const [verifying, setVerifying] = useState(true);
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

    useEffect(() => {
        const verifySession = async () => {
            if (!user || !sessionId) {
                setVerifying(false);
                return;
            }

            try {
                let attempts = 0;
                const maxAttempts = 5;

                while (attempts < maxAttempts) {
                    try {
                        const data = await subscriptionService.getUserSubscription(user.id);
                        if (data && (data.status === 'active' || data.status === 'trialing')) {
                            setSubscription(data);
                            break;
                        }
                    } catch (err) {
                        console.error("Error fetching sub:", err);
                    }

                    await new Promise(r => setTimeout(r, 2000));
                    attempts++;
                }
            } catch (err) {
                console.error("Verification error:", err);
            } finally {
                setVerifying(false);
            }
        };

        verifySession();
    }, [user, sessionId]);

    const handleGoDashboard = () => navigate('/');

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden text-gray-900">
            <Sidebar />
            <main className="flex-1 overflow-y-auto lg:ml-0 flex items-center justify-center p-6">
                <Card className="max-w-md w-full border border-gray-200 shadow-2xl bg-white rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-500">
                    <div className="h-2 bg-brand-primary-600 w-full" />
                    <CardHeader className="pt-10 pb-6 text-center">
                        <div className="mx-auto h-20 w-20 rounded-full bg-green-50 flex items-center justify-center mb-6 ring-8 ring-green-50/50">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-3xl font-extrabold text-gray-900">Payment Successful!</CardTitle>
                        <p className="text-gray-500 mt-2 text-base">
                            Thank you for your subscription. Your account is being updated.
                        </p>
                    </CardHeader>

                    <CardContent className="px-8 pb-8 text-center">
                        {verifying ? (
                            <div className="flex flex-col items-center gap-3 py-4">
                                <Loader2 className="h-6 w-6 text-brand-primary-600 animate-spin" />
                                <span className="text-sm font-medium text-gray-500">Confirming your subscription status...</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                    <div className="flex justify-between text-sm mb-3">
                                        <span className="text-gray-500">Status</span>
                                        <span className="font-bold text-green-600 uppercase tracking-wider text-xs bg-green-100 px-2 py-0.5 rounded-full">Active</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-3">
                                        <span className="text-gray-500">Session ID</span>
                                        <span className="font-mono text-[10px] text-gray-400 max-w-[150px] truncate">{sessionId}</span>
                                    </div>
                                    {subscription && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Plan</span>
                                            <span className="font-bold text-gray-900 capitalize">{subscription.plan_type}</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 leading-relaxed px-4">
                                    You now have full access to all premium features. Check your email for the receipt.
                                </p>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="px-8 pb-10 flex flex-col gap-3">
                        <Button
                            onClick={handleGoDashboard}
                            className="w-full h-12 text-base font-semibold bg-brand-primary-600 hover:bg-brand-primary-700 text-white rounded-xl shadow-lg shadow-brand-primary-200 transition-all flex items-center justify-center gap-2"
                        >
                            <Home className="h-4 w-4" />
                            Return to Dashboard
                        </Button>
                    </CardFooter>
                </Card>
            </main>
        </div>
    );
}
