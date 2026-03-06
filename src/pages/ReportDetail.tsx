import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/Loading';
import {
    ArrowLeft,
    FileText,
    Clock,
    CheckCircle2,
    RefreshCw,
    Download,
    Play,
    User,
    CalendarDays,
    Volume2,
    Phone
} from 'lucide-react';
import { getTranscript, downloadPDF } from '@/services/transcriptServices';
import type { VoiceTranscript } from '@/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ReportDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [transcript, setTranscript] = useState<VoiceTranscript | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const loadTranscript = async () => {
            if (!id) return;
            try {
                setIsLoading(true);
                const data = await getTranscript(id);
                setTranscript(data);
            } catch (error) {
                console.error('Error loading transcript:', error);
                toast.error('Failed to load report details');
                navigate('/dashboard');
            } finally {
                setIsLoading(false);
            }
        };

        loadTranscript();
    }, [id, navigate]);

    const handleDownload = async () => {
        if (!transcript) return;
        try {
            toast.loading('Generating PDF...', { id: 'download' });
            const blob = await downloadPDF(transcript.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_${transcript.id.slice(0, 8)}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('PDF downloaded!', { id: 'download' });
        } catch (error: any) {
            console.error('Download error:', error);
            toast.error(error.message || 'Failed to download PDF', { id: 'download' });
        }
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    if (isLoading) return <Loading />;
    if (!transcript) return null;

    const title = transcript.user_templates?.name || 'Untitled Template';
    const authorName = transcript.profiles?.full_name || 'Unknown';
    const formattedDate = format(new Date(transcript.created_at), 'MMMM d, yyyy');
    const filledData = (transcript.filled_data as Record<string, any>) || {};

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 bg-gray-50/30 min-h-screen">
            {/* Navigation & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <Button 
                    variant="ghost" 
                    onClick={() => navigate(-1)}
                    className="w-fit -ml-2 text-gray-500 hover:text-brand-primary-600 hover:bg-brand-primary-50 transition-all duration-200"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Dashboard
                </Button>
                
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={handleDownload}
                        className="bg-white border-gray-200 shadow-sm hover:border-brand-primary-200 hover:bg-brand-primary-50 hover:text-brand-primary-700 transition-all duration-200"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </Button>
                    <Badge className={`
                        px-4 py-1.5 rounded-full border-none shadow-sm flex items-center gap-2 text-sm font-semibold tracking-wide
                        ${transcript.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}
                    `}>
                        <div className={`w-2 h-2 rounded-full ${transcript.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                        {transcript.status === 'completed' ? 'Confirmed' : 'Processing'}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-10">
                    <Card className="border-0 shadow-xl shadow-gray-200/50 bg-white overflow-hidden rounded-2xl">
                        <CardHeader className="p-8 sm:p-10 border-b border-gray-50 bg-white relative">
                            <div className="absolute top-0 left-0 w-2 h-full bg-brand-primary-600" />
                            <div className="space-y-4">
                                {(() => {
                                    const placeVisited = filledData.place_visited ? String(filledData.place_visited) : '';
                                    return (
                                        <>
                                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
                                                {placeVisited || title}
                                            </h1>
                                            <div className="flex items-center gap-2.5 text-gray-500 font-semibold bg-gray-50 w-fit px-4 py-1.5 rounded-lg border border-gray-100">
                                                <FileText className="w-5 h-5 text-brand-primary-500" />
                                                <span className="text-sm uppercase tracking-wider">Template: {title}</span>
                                            </div>
                                        </>
                                    );
                                })()}
                                <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-gray-300" />
                                        <span>Reported by <span className="text-gray-700 font-bold">{authorName}</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <CalendarDays className="w-4 h-4 text-gray-300" />
                                        <span>{formattedDate}</span>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="p-8 sm:p-10 space-y-12">
                            {/* Detailed Fields Section */}
                            <section>
                                <h2 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-brand-primary-600 rounded-full" />
                                    Report Details
                                </h2>
                                <div className="grid grid-cols-1 gap-8">
                                    {Object.entries(filledData).map(([key, value]) => {
                                        if (key === 'place_visited') return null;
                                        return (
                                            <div key={key} className="group hover:bg-gray-50/50 p-4 -m-4 rounded-xl transition-colors duration-200">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 group-hover:text-brand-primary-500 transition-colors">
                                                    {key.split('_').join(' ')}
                                                </p>
                                                <div className="text-gray-700 leading-relaxed font-medium text-lg border-l-2 border-gray-100 pl-4">
                                                    {String(value) || <span className="text-gray-300 italic">No information provided</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Voice Transcript Section */}
                            <section className="bg-blue-50/30 rounded-2xl p-8 border border-blue-50/50">
                                <h2 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-3">
                                    <Volume2 className="w-6 h-6 text-blue-600" />
                                    Voice Recording Transcript
                                </h2>
                                <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100/50 italic text-gray-600 leading-loose text-lg font-medium relative">
                                    <div className="absolute top-4 right-4 text-blue-100 transform translate-x-2 -translate-y-2">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V4L18.017 4C19.1216 4 20.017 4.89543 20.017 6V15C20.017 17.2091 18.2261 19 16.017 19H14.017V21ZM5.017 21L5.017 18C5.017 16.8954 5.91243 16 7.017 16H10.017C10.5693 16 11.017 15.5523 11.017 15V9C11.017 8.44772 10.5693 8 10.017 8H7.017C5.91243 8 5.017 7.10457 5.017 6V4L9.017 4C10.1216 4 11.017 4.89543 11.017 6V15C11.017 17.2091 9.2261 19 7.017 19H5.017V21Z"/></svg>
                                    </div>
                                    {transcript.modified_transcript || transcript.transcript || 'No transcript available'}
                                </div>
                            </section>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    {/* Audio Player Card */}
                    {transcript.audio_url && (
                        <Card className="border-0 shadow-lg shadow-gray-200/50 bg-white overflow-hidden rounded-2xl">
                             <CardHeader className="p-6 bg-brand-primary-600 text-white">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Volume2 className="w-5 h-5 shrink-0" />
                                    Original Recording
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <audio 
                                    ref={audioRef} 
                                    src={transcript.audio_url} 
                                    onEnded={() => setIsPlaying(false)}
                                    className="hidden" 
                                />
                                <div className="flex flex-col items-center gap-4">
                                    <Button 
                                        size="lg" 
                                        onClick={togglePlay}
                                        className="w-20 h-20 rounded-full bg-brand-primary-50 text-brand-primary-600 hover:bg-brand-primary-100 hover:scale-105 active:scale-95 transition-all shadow-inner border-4 border-white"
                                    >
                                        <Play className={`w-8 h-8 ${isPlaying ? 'animate-pulse' : ''}`} />
                                    </Button>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-900">{isPlaying ? 'Playing Audio' : 'Play Recording'}</p>
                                        <p className="text-xs text-gray-400 font-medium">Standard MP3 Audio</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Meta Info Card */}
                    <Card className="border-0 shadow-lg shadow-gray-200/50 bg-white rounded-2xl overflow-hidden">
                        <CardHeader className="p-6 border-b border-gray-50">
                            <CardTitle className="text-lg text-gray-900">System Logs</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5 text-violet-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Time Created</p>
                                    <p className="text-sm font-bold text-gray-700">{format(new Date(transcript.created_at), 'h:mm a')}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                                    <Phone className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Source Phone</p>
                                    <p className="text-sm font-bold text-gray-700">{transcript.phone_number}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 pt-4 border-t border-gray-50">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm overflow-hidden">
                                     <User className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Assigned Manager</p>
                                    <p className="text-sm font-bold text-gray-700">{profile?.manager_profiles?.full_name || 'N/A'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
