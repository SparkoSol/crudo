import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Clock, Calendar, RefreshCw, Loader2, Play, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTranscripts, getManagerTranscripts, downloadPDF, deleteTranscript } from '@/services/transcriptServices';
import type { VoiceTranscript } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Loading } from '@/components/Loading';

export default function VoiceTranscripts() {
  const { profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VoiceTranscript | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const loadTranscripts = async () => {
    try {
      setIsLoading(true);
      const data = profile?.role === 'manager' 
        ? await getManagerTranscripts()
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
    if (profile) {
      loadTranscripts();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [profile]);

  const handlePlayAudio = (e: React.MouseEvent, transcript: VoiceTranscript) => {
    e.stopPropagation();
    if (!transcript.audio_url) {
      toast.error('No audio recording available for this report');
      return;
    }

    if (playingId === transcript.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const newAudio = new Audio(transcript.audio_url);
    
    newAudio.onended = () => {
      setPlayingId(null);
    };

    newAudio.onerror = () => {
      console.error('Audio playback failed for URL:', transcript.audio_url);
      toast.error('Failed to play audio. The recording may be unavailable.');
      setPlayingId(null);
    };

    newAudio.play().then(() => {
      audioRef.current = newAudio;
      setPlayingId(transcript.id);
    }).catch((err) => {
      console.error('Audio play error:', err);
      toast.error('Failed to play audio. The recording may be unavailable.');
    });
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

  const handleDeleteReport = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await deleteTranscript(deleteTarget.id);
      setTranscripts(prev => prev.filter(t => t.id !== deleteTarget.id));
      toast.success('Report deleted successfully');
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast.error('Failed to delete report');
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100 hover:bg-emerald-100 hover:shadow-emerald-200 hover:scale-[1.04] transition-all duration-200 cursor-default select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Confirmed
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100 hover:bg-amber-100 hover:shadow-amber-200 hover:scale-[1.04] transition-all duration-200 cursor-default select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending
          </Badge>
        );
      case 'retaken':
        return (
          <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200 shadow-sm shadow-slate-100 hover:bg-slate-200 hover:shadow-slate-200 hover:scale-[1.04] transition-all duration-200 cursor-default select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Retaken
          </Badge>
        );
      default:
        return (
          <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-gray-100 text-gray-600 border-gray-200 shadow-sm hover:bg-gray-200 hover:scale-[1.04] transition-all duration-200 cursor-default select-none">
            {status}
          </Badge>
        );
    }
  };

  const isManager = profile?.role === 'manager';

  if (authLoading || isLoading && transcripts.length === 0) {
    return <Loading message="Loading transcripts..." fullScreen />;
  }

  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Voice Transcripts</h1>
            <p className="text-gray-500 mt-1">View and manage all your voice report transcripts</p>
          </div>
          <Button 
            variant="outline" 
            onClick={loadTranscripts}
            className="w-full sm:w-auto"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          {transcripts.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-14 w-14 text-gray-200 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">No transcripts found</h3>
                <p className="text-gray-500 max-w-sm text-center mt-1">
                  Your recent reports will appear here once they are processed.
                </p>
              </CardContent>
            </Card>
          ) : (
            transcripts.map((transcript) => {
              const placeVisited = transcript.filled_data ? String((transcript.filled_data as Record<string, string>).place_visited || '') : '';
              const templateName = transcript.user_templates?.name || 'Untitled Template';
              
              return (
                <Card
                  key={transcript.id}
                  className="group border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 bg-white overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/reporte/${transcript.id}`)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex flex-col items-start gap-2.5">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(transcript.status)}
                          {transcript.modified_transcript && (
                            <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100 hover:bg-blue-100 hover:shadow-blue-200 hover:scale-[1.04] transition-all duration-200 cursor-default select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              Updated
                            </Badge>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-xl group-hover:text-brand-primary-600 transition-colors">
                            {placeVisited || templateName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 font-medium mt-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Template: {templateName}</span>
                          </div>
                          <div className="text-sm text-gray-400 font-normal mt-1">
                            by <span className="text-gray-600 font-medium">{transcript.profiles?.full_name || 'Unknown Salesperson'}</span> • {format(new Date(transcript.created_at), "MMM d, yyyy")}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full mt-3 mb-4" />

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{transcript.audio_duration || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:flex">
                          <Calendar className="w-4 h-4" />
                          <span>{format(new Date(transcript.created_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handlePlayAudio(e, transcript)}
                          className={`h-8 w-8 transition-colors ${playingId === transcript.id
                              ? "text-brand-primary-600 bg-brand-primary-50"
                              : "text-gray-400 hover:text-brand-primary-600 hover:bg-brand-primary-50"
                            }`}
                          title={playingId === transcript.id ? "Pause Recording" : "Play Recording"}
                        >
                          {playingId === transcript.id ? (
                            <div className="flex gap-0.5 items-end h-3">
                              <div className="w-0.5 bg-current animate-[bounce_0.6s_infinite] h-full" />
                              <div className="w-0.5 bg-current animate-[bounce_0.8s_infinite] h-2" />
                              <div className="w-0.5 bg-current animate-[bounce_0.5s_infinite] h-3" />
                            </div>
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (transcript.status === 'confirmed') {
                              handleDownloadPDF(transcript.id);
                            }
                          }}
                          disabled={downloadingId === transcript.id || transcript.status !== 'confirmed'}
                          className="h-8 w-8 text-gray-400 hover:text-brand-primary-600 hover:bg-brand-primary-50 transition-colors"
                          title="Download PDF"
                        >
                          {downloadingId === transcript.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        {isManager && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(transcript);
                            }}
                            disabled={deletingId === transcript.id}
                            className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Report"
                          >
                            {deletingId === transcript.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={handleDeleteReport}
        title="Delete Report"
        description={`Are you sure you want to permanently delete "${
          deleteTarget?.user_templates?.name || 'this report'
        }" by ${deleteTarget?.profiles?.full_name || 'Unknown Salesperson'}? This action cannot be undone and all associated data will be lost.`}
        confirmText="Delete Report"
        cancelText="Cancel"
        variant="destructive"
        isLoading={!!deletingId}
      />
    </div>
  );
}
