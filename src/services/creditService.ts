import { supabase } from '@/lib/supabaseClient';
import type { CreditsWallet, CreditTransaction } from '@/types';
import { getProfile } from './profileServices';

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
    }
};
