import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Clock, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';
import { getTranscripts, downloadPDF } from '@/services/transcriptServices';
import type { VoiceTranscript } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { subscriptionService } from '@/services/subscriptionService';

export default function VoiceTranscripts() {
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isIncrementing, setIsIncrementing] = useState(false);

  useEffect(() => {
    loadTranscripts();
  }, []);

  const loadTranscripts = async () => {
    try {
      setLoading(true);
      const data = await getTranscripts();
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
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto pt-20 lg:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Voice Transcripts</h1>
              <p className="text-gray-600">
                View and manage your voice message transcripts
              </p>
            </div>
          </div>

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
            ) : (
              <div className="space-y-4">
                {transcripts.map((transcript) => (
                  <Card key={transcript.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <CardTitle className="text-xl font-bold text-gray-900">
                              {transcript.user_templates?.name || 'Untitled Template'}
                            </CardTitle>
                            {getStatusBadge(transcript.status)}
                          </div>
                          <CardDescription className="flex items-center gap-2 text-gray-500">
                            <Clock className="h-3 w-3" />
                            {format(new Date(transcript.created_at), 'PPpp')} • {transcript.phone_number}
                          </CardDescription>
                        </div>
                        {transcript.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(transcript.id)}
                            disabled={downloadingId === transcript.id}
                            className="gap-2 border-brand-primary-100 text-brand-primary-700 hover:bg-brand-primary-50 hover:text-brand-primary-800 shrink-0"
                          >
                            {downloadingId === transcript.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4" />
                                Download PDF
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div>
                        <h4 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-tight flex items-center gap-2">
                          <FileText className="h-4 w-4 text-brand-primary-500" />
                          Transcript
                        </h4>
                        <div className="bg-white border border-gray-100 p-4 rounded-xl text-sm text-gray-600 leading-relaxed shadow-sm">
                          {transcript.transcript}
                        </div>
                      </div>

                      {transcript.filled_data && Object.keys(transcript.filled_data).length > 0 && (
                        <div>
                          <h4 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-tight flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-brand-primary-500" />
                            Extracted Data
                          </h4>
                          <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                            {Object.entries(transcript.filled_data).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between border-b border-gray-100 pb-1 last:border-0 last:pb-0">
                                <span className="text-sm font-medium text-gray-500">
                                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                                </span>
                                <span className="text-sm font-semibold text-gray-900">
                                  {value !== null && value !== undefined ? String(value) : 'N/A'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
