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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { subscriptionService } from '@/services/subscriptionService';

export default function VoiceTranscripts() {
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isIncrementing, setIsIncrementing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Test Credits
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Test Credits</DialogTitle>
                  <DialogDescription>
                    This is for testing purposes only. Click the button below to increment your usage credits.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6 flex justify-center">
                  <Button
                    onClick={async () => {
                      try {
                        setIsIncrementing(true);
                        const result = await subscriptionService.incrementCredits(1);
                        if (result.total_usage !== undefined) {
                          toast.success(`Credits incremented. New Total: ${result.total_usage}`);
                        } else {
                          toast.success('Credits incremented successfully');
                        }
                        setIsModalOpen(false);
                      } catch (error) {
                        console.error('Failed to increment credits:', error);
                        toast.error('Failed to increment credits');
                      } finally {
                        setIsIncrementing(false);
                      }
                    }}
                    disabled={isIncrementing}
                    className="w-full sm:w-auto"
                  >
                    {isIncrementing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Incrementing...
                      </>
                    ) : (
                      'Increment Credit (+1)'
                    )}
                  </Button>
                </div>
                <DialogFooter className="sm:justify-start">
                  <p className="text-xs text-gray-500">
                    Depending on Stripe latency, it might take a moment to reflect in subscription details.
                  </p>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

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
                <Card key={transcript.id} className="border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">
                            {transcript.user_templates?.name || 'Untitled Template'}
                          </CardTitle>
                          {getStatusBadge(transcript.status)}
                        </div>
                        <CardDescription>
                          {format(new Date(transcript.created_at), 'PPpp')} • {transcript.phone_number}
                        </CardDescription>
                      </div>
                      {transcript.status === 'confirmed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPDF(transcript.id)}
                          disabled={downloadingId === transcript.id}
                          className="gap-2"
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
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Transcript</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {transcript.transcript}
                      </p>
                    </div>

                    {transcript.filled_data && Object.keys(transcript.filled_data).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Filled Template Data</h4>
                        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                          {Object.entries(transcript.filled_data).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="text-sm font-medium text-gray-700 min-w-[120px]">
                                {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}:
                              </span>
                              <span className="text-sm text-gray-600 flex-1">
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
      </main>
    </div>
  );
}
