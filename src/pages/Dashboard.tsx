import { useState, useEffect } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SearchBar } from '@/components/dashboard/SearchBar';
import { Loading } from '@/components/Loading';
import { FileText, Calendar, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTranscripts, getManagerTranscripts } from '@/services/transcriptServices';
import { getManagedProfiles } from '@/services/profileServices';
export default function Dashboard() {
  const { profile, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalReports: 0,
    thisWeekReports: 0,
    activeSalespeople: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const transcripts = profile?.role === 'manager'
          ? await getManagerTranscripts()
          : await getTranscripts();

        const now = new Date();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

        const thisWeekCount = transcripts.filter(t => new Date(t.created_at) >= startOfWeek).length;

        let salespeopleCount = 0;
        if (profile?.role === 'manager') {
          const profiles = await getManagedProfiles();
          salespeopleCount = profiles.length;
        }

        setStats({
          totalReports: transcripts.length,
          thisWeekReports: thisWeekCount,
          activeSalespeople: salespeopleCount
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    if (profile) {
      fetchStats();
    }
  }, [profile]);

  if (authLoading) {
    return <Loading message="Loading dashboard..." fullScreen />;
  }

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Home</h1>
        <p className="text-gray-600">
          Manage and review field reports from your sales team
        </p>
      </div>

      <div className="mb-6 flex justify-end">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search reports..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Reports"
          value={stats.totalReports.toString()}
          icon={FileText}
          iconColor="text-brand-primary-600"
        />
        <StatsCard
          title="This Week"
          value={stats.thisWeekReports.toString()}
          icon={Calendar}
          iconColor="text-green-600"
        />
        {profile?.role === 'manager' && (
          <StatsCard
            title="Active Salespeople"
            value={stats.activeSalespeople.toString()}
            icon={Users}
            iconColor="text-purple-600"
          />
        )}
      </div>
    </div>
  );
}
