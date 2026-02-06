import { supabase } from '@/lib/supabaseClient';
import type {
    SubscriptionData,
    SubscriptionDetails,
    SubscriptionPlanType
} from '@/types';


export const subscriptionService = {

    getAccessToken: async (): Promise<string> => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session found');
        return session.access_token;
    },

    getUserSubscription: async (userId: string): Promise<SubscriptionData | null> => {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['active', 'trialing', 'past_due'])
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error fetching subscription:', error);
            throw error;
        }

        return data as SubscriptionData | null;
    },

    getSubscriptionDetails: async (token?: string): Promise<SubscriptionDetails> => {
        const accessToken = token || await subscriptionService.getAccessToken();

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-subscription-details`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch subscription details');
        }

        const data = await response.json();
        return {
            next_billing_date: data.next_billing_date || null,
            usage_credits: data.usage_credits || 0
        };
    },

    createCheckoutSession: async (params: {
        userId: string;
        email: string;
        planType: SubscriptionPlanType;
        accessToken?: string;
    }): Promise<{ url: string }> => {
        const { userId, email, planType, accessToken: providedToken } = params;
        const accessToken = providedToken || await subscriptionService.getAccessToken();

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                user_id: userId,
                email: email,
                plan_type: planType,
            }),
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        if (!result.url) {
            throw new Error('No checkout URL returned from server');
        }

        return { url: result.url };
    },

    cancelSubscription: async (token?: string): Promise<any> => {
        const accessToken = token || await subscriptionService.getAccessToken();

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to cancel subscription");
        }

        return result;
    },

    incrementCredits: async (amount: number = 1, token?: string): Promise<any> => {
        const accessToken = token || await subscriptionService.getAccessToken();

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/increment-credits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ amount }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to increment credits");
        }

        return result;
    }
};
