import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SearchBar } from '@/components/dashboard/SearchBar';
import { Loading } from '@/components/Loading';
import { FileText, Calendar, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  if (authLoading) {
    return <Loading message="Loading dashboard..." fullScreen />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0">
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
              value="23"
              icon={FileText}
              iconColor="text-brand-primary-600"
            />
            <StatsCard
              title="This Week"
              value="1"
              icon={Calendar}
              iconColor="text-green-600"
            />
            <StatsCard
              title="Active Salespeople"
              value="1"
              icon={Users}
              iconColor="text-purple-600"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
