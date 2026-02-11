import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Clock, CheckCircle2, RefreshCw, Loader2, User } from 'lucide-react';
import { subscriptionService } from '@/services/subscriptionService';
import { useAuth } from '@/contexts/AuthContext';
import { getTranscripts, getManagerTranscripts, downloadPDF } from '@/services/transcriptServices';
import type { VoiceTranscript } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function VoiceTranscripts() {
  const { profile } = useAuth();
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isIncrementing, setIsIncrementing] = useState(false);

  useEffect(() => {
    if (profile) {
      loadTranscripts();
    }
  }, [profile]);

  const loadTranscripts = async () => {
    try {
      setLoading(true);
      const data = profile?.role === 'manager'
        ? await getManagerTranscripts()
        : await getTranscripts();
      setTranscripts(data);
    } catch (error) {
      console.error('Failed to load transcripts:', error);
      toast.error('Failed to load transcripts');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto pt-20 lg:pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Voice Transcripts</h1>
          <p className="text-gray-600">
            View and manage your voice message transcripts
          </p>
        </div>
      </div>

      {profile?.role === 'manager' && (
        <div className="mt-12 pb-8 border-b border-gray-200">
          <Card className="bg-gradient-to-br from-brand-primary-50 via-white to-gray-50 border-brand-primary-100 shadow-sm overflow-hidden">
            <div className="h-1 bg-brand-primary-600 w-full" />
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 bg-brand-primary-100 text-brand-primary-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
                    <RefreshCw className="h-3 w-3" />
                    Developer Tools
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Test Your Credits</h3>
                  <p className="text-gray-600 max-w-xl text-sm md:text-base">
                    Simulate usage by incrementing your session credits. This helps verify your subscription status and usage reporting without making live calls.
                  </p>
                  <p className="text-[10px] text-gray-400 mt-4 leading-relaxed italic">
                    * Pulse: Stripe sync may take a few moments to reflect in your dashboard.
                  </p>
                </div>

                <div className="flex-shrink-0 w-full md:w-auto">
                  <Button
                    onClick={async () => {
                      try {
                        setIsIncrementing(true);
                        const result = await subscriptionService.incrementCredits(1);
                        if (result.total_usage !== undefined) {
                          toast.success(`Credits updated successfully`);
                        } else {
                          toast.success('Credits updated');
                        }
                      } catch (error: any) {
                        console.error('Failed to increment credits:', error);
                        toast.error(error.message);
                      } finally {
                        setIsIncrementing(false);
                      }
                    }}
                    disabled={isIncrementing}
                    className="w-full md:w-auto h-14 px-8 text-base font-bold bg-brand-primary-600 hover:bg-brand-primary-700 text-white rounded-2xl shadow-xl shadow-brand-primary-100 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {isIncrementing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-5 w-5" />
                        Increment Credits (+1)
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      <div className="space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary-600" />
          </div>
        ) : transcripts.length === 0 ? (
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No transcripts yet</h3>
              <p className="text-gray-600">
                Send a voice message via WhatsApp to get started
              </p>
            </CardContent>
          </Card>
        ) : profile?.role === 'manager' ? (
          <div className="space-y-12">
            {Object.entries(
              transcripts.reduce((acc, transcript) => {
                const name = transcript.profiles?.full_name || 'Unknown Salesperson';
                if (!acc[name]) acc[name] = [];
                acc[name].push(transcript);
                return acc;
              }, {} as Record<string, VoiceTranscript[]>)
            ).map(([salespersonName, salespersonTranscripts]) => (
              <div key={salespersonName} className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-brand-primary-100 flex items-center justify-center text-brand-primary-700">
                    <User className="h-4 w-4" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 tracking-tight">
                    {salespersonName}
                    <span className="ml-3 text-sm font-medium text-gray-400">
                      ({salespersonTranscripts.length} {salespersonTranscripts.length === 1 ? 'report' : 'reports'})
                    </span>
                  </h2>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {salespersonTranscripts.map((transcript) => (
                    <TranscriptCard
                      key={transcript.id}
                      transcript={transcript}
                      getStatusBadge={getStatusBadge}
                      handleDownloadPDF={handleDownloadPDF}
                      downloadingId={downloadingId}
                      showSalesperson={false}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transcripts.map((transcript) => (
              <TranscriptCard
                key={transcript.id}
                transcript={transcript}
                getStatusBadge={getStatusBadge}
                handleDownloadPDF={handleDownloadPDF}
                downloadingId={downloadingId}
                showSalesperson={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TranscriptCard({
  transcript,
  getStatusBadge,
  handleDownloadPDF,
  downloadingId,
  showSalesperson = true
}: {
  transcript: VoiceTranscript;
  getStatusBadge: (status: string) => React.ReactNode;
  handleDownloadPDF: (id: string) => void;
  downloadingId: string | null;
  showSalesperson?: boolean;
}) {
  return (
    <Card className="group border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white overflow-hidden">
      <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 truncate text-base">
              {transcript.user_templates?.name || 'Untitled Template'}
            </h3>
            {getStatusBadge(transcript.status)}
          </div>

          <div className="flex flex-col gap-0.5">
            {showSalesperson && (
              <p className="text-sm font-medium text-gray-600 truncate">
                {transcript.profiles?.full_name || 'Unknown Salesperson'}
              </p>
            )}
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
  );
}
