import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Zap, CreditCard, AlertTriangle, ShoppingCart } from 'lucide-react';
import { TIER_LABELS, BILLING_PERIOD_LABELS } from '@/constants/subscription';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { subscriptionService } from '@/services/subscriptionService';
import type { SubscriptionData, SubscriptionDetails, CreditsWallet, CreditBatch } from '@/types';

interface SubscriptionSettingsProps {
    initialSubscription?: SubscriptionData | null;
    initialDetails?: SubscriptionDetails | null;
    initialWallet?: CreditsWallet | null;
}

export function SubscriptionSettings({ initialSubscription, initialDetails, initialWallet }: SubscriptionSettingsProps) {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(!initialSubscription);
    const [subscription, setSubscription] = useState<SubscriptionData | null>(initialSubscription || null);
    const [details, setDetails] = useState<SubscriptionDetails>(
        initialDetails || { next_billing_date: null, usage_credits: 0 }
    );
    const [wallet, setWallet] = useState<CreditsWallet | null>(initialWallet || null);
    const [batches, setBatches] = useState<CreditBatch[]>([]);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [showCancelDialog, setShowCancelDialog] = useState(false);

    useEffect(() => {
        if (!user) return;

        if (initialSubscription) {
            setSubscription(initialSubscription);
            if (initialDetails) setDetails(initialDetails);
            if (initialWallet) setWallet(initialWallet);
            import('@/services/creditService').then(m => m.creditService.getBatches())
                .then(setBatches)
                .catch(() => {});
            setLoading(false);
            return;
        }

        const fetchSub = async () => {
            setLoading(true);
            try {
                const subData = await subscriptionService.getUserSubscription(user.id);
                if (subData) {
                    setSubscription(subData);
                    const [detailData, walletData, batchesData] = await Promise.all([
                        subscriptionService.getSubscriptionDetails(),
                        import('@/services/creditService').then(m => m.creditService.getWallet()),
                        import('@/services/creditService').then(m => m.creditService.getBatches())
                    ]);
                    setDetails(detailData);
                    setWallet(walletData);
                    setBatches(batchesData);
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
            toast.success("Suscripción cancelada con éxito");
            if (subscription) {
                setSubscription({ ...subscription, status: 'canceled' });
            }
            setShowCancelDialog(false);
            await refreshProfile();
            navigate('/subscription');
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Error al cancelar la suscripción");
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
                            <CardTitle className="text-xl">Suscripción</CardTitle>
                            <CardDescription>Actualmente estás en el plan Gratuito.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-gray-600 mb-4">Mejora a un plan para desbloquear funciones premium y créditos de uso.</p>
                    <Button onClick={() => navigate('/subscription')} className="bg-brand-primary-600 hover:bg-brand-primary-700">
                        Ver Planes
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
                            <CardTitle className="text-xl">Suscripción y Facturación</CardTitle>
                            <CardDescription>Gestiona tu plan actual y uso</CardDescription>
                        </div>
                    </div>
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${subscription.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                        {subscription.status === 'active' ? 'Activa' : 
                         subscription.status === 'past_due' ? 'Pago Pendiente' : 
                         subscription.status === 'canceled' ? 'Cancelada' : 
                         subscription.status}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Plan Actual</p>
                            <p className="text-lg font-bold text-gray-900 capitalize flex items-center gap-2">
                                {TIER_LABELS[subscription.plan_type] || subscription.plan_type}
                                {subscription.billing_period && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        subscription.billing_period === 'annual'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-200 text-gray-600'
                                    }`}>
                                        {BILLING_PERIOD_LABELS[subscription.billing_period] || subscription.billing_period}
                                    </span>
                                )}
                            </p>
                        </div>
                        {details.next_billing_date && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-xs text-gray-500 mb-1">Próxima Fecha de Facturación</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {new Date(details.next_billing_date).toLocaleDateString('es-ES', {
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
                            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Créditos</p>
                            <div className="flex items-end gap-2">
                                <p className="text-2xl font-bold text-gray-900">
                                    {batches.reduce((sum, b) => sum + b.credits_remaining, 0) || (wallet?.total_credits ?? 0)}
                                </p>
                                <p className="text-sm font-normal text-gray-500 mb-1">disponibles</p>
                                <CreditCard className="h-5 w-5 text-orange-500 mb-1 ml-auto" />
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-gray-500">
                                    {wallet ? wallet.used_credits_this_month : details.usage_credits} usados este mes
                                </span>
                                {batches.filter(b => b.source === 'rollover').reduce((sum, b) => sum + b.credits_remaining, 0) > 0 && (
                                    <span className="text-xs text-blue-600 font-medium">
                                        {batches.filter(b => b.source === 'rollover').reduce((sum, b) => sum + b.credits_remaining, 0)} acumulados
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <p className="text-xs text-gray-500 flex-1">
                                Tus créditos más antiguos se usan primero. Los créditos no utilizados se acumulan para el mes siguiente (hasta el 100% de tu última compra).
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/subscription#credit-packs')}
                                className="flex-shrink-0 gap-1.5 text-xs text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300"
                            >
                                <ShoppingCart className="h-3 w-3" />
                                Comprar Créditos
                            </Button>
                        </div>
                    </div>
                </div>

                {subscription.status === 'past_due' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Hay un problema con tu método de pago. Por favor, actúalo.</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-4 border-t border-gray-100 flex justify-between bg-gray-50/50">
                <p className="text-xs text-gray-500">
                    Para mejorar o cambiar tu plan, visita la <a href="/subscription" className="text-brand-primary-600 hover:underline">página de Suscripción</a>.
                </p>
                {subscription.status !== 'canceled' && (
                    <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={cancelLoading}
                        className="gap-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                    >
                        {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                        Cancelar Plan
                    </Button>
                )}
            </CardFooter>

            <ConfirmationDialog
                open={showCancelDialog}
                onOpenChange={setShowCancelDialog}
                onConfirm={executeCancellation}
                title="Cancelar Suscripción"
                description="Si cancelas, perderás el acceso a la plataforma y todos los créditos restantes. Se cobrarán los créditos que ya hayas usado este mes. Esta acción no se puede deshacer."
                confirmText="Sí, cancelar todo"
                cancelText="Mantener mi plan"
                variant="destructive"
                isLoading={cancelLoading}
            />
        </Card>
    );
}
