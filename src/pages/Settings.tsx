import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProfileInformation } from '@/components/settings/ProfileInformation';
import { ChangePassword } from '@/components/settings/ChangePassword';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { SettingsSkeleton } from '@/components/settings/SettingsSkeleton';
import { getProfile } from '@/services/profileServices';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionService } from '@/services/subscriptionService';
import { creditService } from '@/services/creditService';
import toast from 'react-hot-toast';
import type { SubscriptionData, SubscriptionDetails, CreditsWallet } from '@/types';
export default function Settings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [subDetails, setSubDetails] = useState<SubscriptionDetails | null>(null);
  const [wallet, setWallet] = useState<CreditsWallet | null>(null);

  const toastShownRef = useRef(false);

  useEffect(() => {
    const creditsPurchased = searchParams.get('credits_purchased');
    if (creditsPurchased && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.success(`${Number(creditsPurchased).toLocaleString()} credits have been added to your account!`, {
        duration: 5000,
        icon: '🎉',
      });
      searchParams.delete('credits_purchased');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const profile = await getProfile();
        setProfileData(profile);

        const sub = await subscriptionService.getUserSubscription(user.id);
        setSubscriptionData(sub);

        if (sub) {
          const [detailData, walletData] = await Promise.all([
            subscriptionService.getSubscriptionDetails(),
            creditService.getWallet()
          ]);
          setSubDetails(detailData);
          setWallet(walletData);
        }
      } catch (error) {
        console.error('Error fetching settings data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">
          Manage your account settings, profile information, and security preferences
        </p>
      </div>

      <div className="space-y-6">
        {loading ? (
          <SettingsSkeleton />
        ) : (
          <>
            < ProfileInformation initialData={profileData} />
            {user?.role !== 'SalesRepresentative' && (
              <SubscriptionSettings
                initialSubscription={subscriptionData}
                initialDetails={subDetails}
                initialWallet={wallet}
              />
            )}
            <ChangePassword />
          </>
        )}
      </div>
    </div>
  );
}
