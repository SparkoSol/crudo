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
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const loadTranscripts = async () => {
    try {
      setIsLoading(true);
      const data = profile?.role === 'manager' 
        ? await getManagerTranscripts(profile.id)
        : await getTranscripts();
      setTranscripts(data);
    } catch (error) {
      console.error('Error loading transcripts:', error);
      toast.error('Failed to load transcripts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTranscripts();
  }, [profile]);

  const handleDownload = async (transcript: VoiceTranscript) => {
    try {
      toast.loading('Generating PDF...', { id: 'download' });
      const blob = await downloadPDF(transcript.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transcript_${transcript.id.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded!', { id: 'download' });
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download PDF', { id: 'download' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none">Processing</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voice Transcripts</h1>
          <p className="text-gray-500">View and manage all your voice report transcripts</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadTranscripts}
          className="w-full sm:w-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {transcripts.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No transcripts yet</h3>
              <p className="text-gray-500 max-w-sm text-center mt-1">
                Once you start recording voice reports via WhatsApp, they will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          transcripts.map((transcript) => (
            <TranscriptCard 
              key={transcript.id} 
              transcript={transcript} 
              onDownload={() => handleDownload(transcript)}
              playingId={playingId}
              setPlayingId={setPlayingId}
              showSalesperson={profile?.role === 'manager'}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TranscriptCard({ 
  transcript, 
  onDownload, 
  playingId, 
  setPlayingId,
  showSalesperson 
}: { 
  transcript: VoiceTranscript; 
  onDownload: () => void;
  playingId: string | null;
  setPlayingId: (id: string | null) => void;
  showSalesperson?: boolean;
}) {
  const isPlaying = playingId === transcript.id;

  const handlePlayPause = () => {
    if (isPlaying) {
      setPlayingId(null);
    } else {
      setPlayingId(transcript.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100/50 flex items-center gap-1.5 px-2.5 py-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-semibold">Confirmed</span>
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100/50 flex items-center gap-1.5 px-2.5 py-0.5">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span className="font-semibold">Processing</span>
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-100/50 flex items-center gap-1.5 px-2.5 py-0.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="font-semibold">Error</span>
          </Badge>
        );
      default:
        return <Badge variant="outline" className="px-2.5 py-0.5 uppercase text-[10px] tracking-wider font-bold">{status}</Badge>;
    }
  };

  return (
    <Card className="group border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white overflow-hidden">
      <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          {(() => {
            const placeVisited = transcript.filled_data ? String((transcript.filled_data as Record<string, string>).place_visited || '') : '';
            const templateName = transcript.user_templates?.name || 'Untitled Template';
            return (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-gray-900 truncate text-base">
                    {placeVisited || templateName}
                  </h3>
                  {getStatusBadge(transcript.status)}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mt-0.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Template: {templateName}</span>
                </div>
              </>
            );
          })()}

          <div className="flex flex-col gap-0.5">
            {showSalesperson && (
              <p className="text-sm font-medium text-gray-600 truncate">
                {transcript.profiles?.full_name || 'Unknown Salesperson'}
              </p>
            )}
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
              {format(new Date(transcript.created_at), "MMM d, yyyy • h:mm a")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onDownload}
            className="h-9 w-9 text-gray-400 hover:text-brand-primary-600 hover:bg-brand-primary-50 transition-colors"
            title="Download PDF"
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-9 w-9 text-gray-400 hover:text-brand-primary-600 hover:bg-brand-primary-50 transition-colors"
            title="View Details"
          >
            <a href={`/reports/${transcript.id}`}>
              <FileText className="h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
      
      {/* Audio Playback Indicator (Subtle) */}
      {transcript.audio_url && (
        <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-50 flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>00:04:00</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{format(new Date(transcript.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

// Helper icons that were missing in the component
function CalendarDays(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}
