import { useState, useEffect } from 'react';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SearchBar } from '@/components/dashboard/SearchBar';
import { Loading } from '@/components/Loading';
import { FileText, Calendar, Users, Clock, CheckCircle2, RefreshCw, Download, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTranscripts, getManagerTranscripts, downloadPDF } from '@/services/transcriptServices';
import { getManagedProfiles } from '@/services/profileServices';
import { StatsCardSkeleton } from '@/components/dashboard/StatsCardSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { VoiceTranscript } from '@/types';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { profile, isLoading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalReports: 0,
    thisWeekReports: 0,
    activeSalespeople: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);
        const fetchedTranscripts = profile?.role === 'manager'
          ? await getManagerTranscripts()
          : await getTranscripts();

        setTranscripts(fetchedTranscripts);

        const now = new Date();
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

        const thisWeekCount = fetchedTranscripts.filter(t => new Date(t.created_at) >= startOfWeek).length;

        let salespeopleCount = 0;
        if (profile?.role === 'manager') {
          const profiles = await getManagedProfiles();
          salespeopleCount = profiles.length;
        }

        setStats({
          totalReports: fetchedTranscripts.length,
          thisWeekReports: thisWeekCount,
          activeSalespeople: salespeopleCount
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (profile) {
      fetchStats();
    }
  }, [profile]);

  const handleDownloadPDF = async (transcriptId: string) => {
    try {
      setDownloadingId(transcriptId);
      const result = await downloadPDF(transcriptId);

      const byteCharacters = atob(result.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'retaken':
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            <RefreshCw className="h-3 w-3 mr-1" />
            Retaken
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredTranscripts = transcripts.filter((t) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      t.user_templates?.name?.toLowerCase().includes(lowerQuery) ||
      t.profiles?.full_name?.toLowerCase().includes(lowerQuery) ||
      t.status?.toLowerCase().includes(lowerQuery)
    );
  });

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

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Metrics</h2>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search stats or reports..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {isLoadingStats ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            {profile?.role === 'manager' && <StatsCardSkeleton />}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Recent Reports</h2>
        </div>

        {isLoadingStats ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary-600" />
          </div>
        ) : filteredTranscripts.length === 0 ? (
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600">
                {searchQuery ? "Try adjusting your search" : "Your recent reports will appear here"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTranscripts.slice(0, 10).map((transcript) => (
              <Card key={transcript.id} className="group border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white overflow-hidden">
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate text-base">
                        {transcript.user_templates?.name || 'Untitled Template'}
                      </h3>
                      {getStatusBadge(transcript.status)}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <p className="text-sm font-medium text-gray-600 truncate">
                        {transcript.profiles?.full_name || 'Unknown Salesperson'}
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                        {format(new Date(transcript.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>

                  {transcript.status === 'confirmed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(transcript.id)}
                      disabled={downloadingId === transcript.id}
                      className="h-10 px-4 gap-2 border-brand-primary-100 text-brand-primary-700 hover:bg-brand-primary-50 hover:text-brand-primary-800 shrink-0 rounded-xl font-semibold transition-colors"
                    >
                      {downloadingId === transcript.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-primary-600" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Download</span>
                        </div>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
