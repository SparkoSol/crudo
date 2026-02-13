import { supabase } from '@/lib/supabaseClient';
import type { CreditsWallet, CreditTransaction, CreditBatch } from '@/types';
import { getProfile } from './profileServices';
import { subscriptionService } from './subscriptionService';

export const creditService = {
    getWallet: async (): Promise<CreditsWallet | null> => {
        const profile = await getProfile();
        if (!profile) return null;

        const managerId = profile.role === 'manager' ? profile.id : profile.manager_id;
        if (!managerId) return null;

        const { data, error } = await supabase
            .from('credits_wallet')
            .select('*')
            .eq('manager_id', managerId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching credits wallet:', error);
            throw error;
        }

        return data;
    },

    getTransactions: async (limit: number = 20): Promise<CreditTransaction[]> => {
        const profile = await getProfile();
        if (!profile) return [];

        const managerId = profile.role === 'manager' ? profile.id : profile.manager_id;
        if (!managerId) return [];

        const { data, error } = await supabase
            .from('credit_transactions')
            .select('*')
            .eq('manager_id', managerId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching credit transactions:', error);
            throw error;
        }

        return data || [];
    },

    getBatches: async (): Promise<CreditBatch[]> => {
        const profile = await getProfile();
        if (!profile) return [];

        const managerId = profile.role === 'manager' ? profile.id : profile.manager_id;
        if (!managerId) return [];

        const { data, error } = await supabase
            .from('credit_batches')
            .select('*')
            .eq('manager_id', managerId)
            .eq('is_active', true)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching credit batches:', error);
            throw error;
        }

        return data || [];
    },

    purchaseCreditPack: async (packId: string): Promise<{ url: string }> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const accessToken = await subscriptionService.getAccessToken();

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/purchase-credits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                user_id: user.id,
                email: user.email,
                pack_id: packId,
            }),
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        if (!result.url) {
            throw new Error('No checkout URL returned');
        }

        return { url: result.url };
    },
};
