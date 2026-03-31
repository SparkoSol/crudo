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
import { es } from 'date-fns/locale';

export default function ReportDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [transcript, setTranscript] = useState<VoiceTranscript | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const fetchTranscript = async () => {
            try {
                if (!id) return;
                setLoading(true);
                const data = await getTranscript(id);
                if (data) {
                    setTranscript(data);
                } else {
                    toast.error('Informe no encontrado');
                    navigate('/');
                }
            } catch (error) {
                console.error('Error fetching transcript:', error);
                toast.error('Error al cargar los detalles del informe');
            } finally {
                setLoading(false);
            }
        };

        fetchTranscript();
    }, [id, navigate]);

    const handlePlayAudio = () => {
        if (!transcript?.audio_url) {
            toast.error('No hay grabación de audio disponible para este informe');
            return;
        }

        if (isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
            return;
        }

        if (audioRef.current) {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch((err) => {
                console.error('Audio play error:', err);
                toast.error('Error al reproducir el audio. La grabación puede no estar disponible.');
            });
        } else {
            const newAudio = new Audio(transcript.audio_url);
            
            newAudio.onended = () => setIsPlaying(false);
            
            newAudio.onerror = () => {
                console.error('Audio playback failed for URL:', transcript.audio_url);
                toast.error('Error al reproducir el audio. La grabación puede no estar disponible.');
                setIsPlaying(false);
            };

            newAudio.play().then(() => {
                audioRef.current = newAudio;
                setIsPlaying(true);
            }).catch((err) => {
                console.error('Audio play error:', err);
                toast.error('Error al reproducir el audio. La grabación puede no estar disponible.');
            });
        }
    };

    const handleDownloadPDF = async () => {
        if (!transcript) return;
        try {
            setDownloading(true);
            const result = await downloadPDF(transcript.id);

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

            toast.success('PDF descargado con éxito');
        } catch (error) {
            console.error('Failed to download PDF:', error);
            toast.error('Error al descargar el PDF');
        } finally {
            setDownloading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return (
                    <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100 hover:bg-emerald-100 hover:shadow-emerald-200 hover:scale-[1.04] transition-all duration-200 cursor-default select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Completado
                    </Badge>
                );
            case 'pending':
                return (
                    <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100 hover:bg-amber-100 hover:shadow-amber-200 hover:scale-[1.04] transition-all duration-200 cursor-default select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <Clock className="h-3.5 w-3.5" />
                        Pendiente
                    </Badge>
                );
            case 'retaken':
                return (
                    <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200 shadow-sm shadow-slate-100 hover:bg-slate-200 hover:shadow-slate-200 hover:scale-[1.04] transition-all duration-200 cursor-default select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <RefreshCw className="h-3.5 w-3.5" />
                        Repetido
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

    if (loading) {
        return <Loading message="Cargando detalles del informe..." fullScreen />;
    }

    if (!transcript) {
        return null; // Should redirect in useEffect
    }

    const filledData = transcript.filled_data || {};
    const title = transcript.user_templates?.name || 'Plantilla sin título';
    const authorName = transcript.profiles?.full_name || 'Vendedor Desconocido';
    const phoneNumber = transcript.profiles?.phone_number || 'N/A';
    const formattedDate = format(new Date(transcript.created_at), "EEEE, d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
    const fields: any[] = transcript.user_templates?.fields || [];
    const isUpdated = !!(transcript.modified_transcript);

    const isValMissing = (v: any): boolean => {
        if (v === null || v === undefined) return true;
        if (Array.isArray(v)) return v.length === 0 || v.every((item: any) => isValMissing(item));
        const s = String(v).trim().toLowerCase();
        return s === '' || s === 'n/a' || s === 'na' || s === 'none' || s === 'no aplica' || s === '[]' || s === 'null';
    };

    // Normalize a key for fuzzy matching: lowercase + remove underscores/hyphens/spaces
    const normalizeKey = (k: string) => k.toLowerCase().replace(/[_\-\s]+/g, '');

    // Build a normalized lookup map from filledData for robust matching
    const filledDataNormMap: Record<string, string> = {};
    Object.keys(filledData).forEach(k => {
        filledDataNormMap[normalizeKey(k)] = k;
    });

    // Get value from filledData using fuzzy matching
    const getFieldVal = (fieldName: string): any => {
        // 1. Exact match
        if (!isValMissing(filledData[fieldName])) return filledData[fieldName];
        // 2. Case variations
        const lower = fieldName.toLowerCase();
        const upper = fieldName.toUpperCase();
        const capitalized = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
        for (const variant of [lower, upper, capitalized]) {
            if (!isValMissing(filledData[variant])) return filledData[variant];
        }
        // 3. Normalized fuzzy match (strip underscores + lowercase)
        const normKey = normalizeKey(fieldName);
        const matchedKey = filledDataNormMap[normKey];
        if (matchedKey && !isValMissing(filledData[matchedKey])) return filledData[matchedKey];
        return null;
    };

    const formatVal = (val: any): string => {
        if (Array.isArray(val)) {
            return val.filter((v: any) => !isValMissing(v)).join(', ');
        }
        return String(val);
    };

    // Normalize place_visited — try all common variants
    const placeVisited: string = String(
        filledData['place_visited'] ||
        filledData['Place_visited'] ||
        filledData['Place Visited'] ||
        filledData['lugar_visitado'] ||
        filledData['Lugar_visitado'] ||
        filledData['lugarvisitado'] ||
        ''
    );
    const placeVisitedDisplay = placeVisited ? placeVisited.charAt(0).toUpperCase() + placeVisited.slice(1) : '';

    // Track which filledData keys have been rendered (using the original key)
    const renderedOrigKeys = new Set<string>();

    // Mark place_visited variants as already handled
    ['place_visited', 'Place_visited', 'Place Visited', 'lugar_visitado',
     'Lugar_visitado', 'lugarvisitado', 'PLACE_VISITED', 'LUGAR_VISITADO'].forEach(k => {
        renderedOrigKeys.add(k);
    });

    const displayFields: { label: string; value: any }[] = [];

    // Smart sections — always shown first if data present, with clean labels
    const smartSections = [
        { key: 'novedades', label: 'Novedades' },
        { key: 'ventas_realizadas', label: 'Ventas Realizadas' },
        { key: 'stock_disponibilidad', label: 'Stock / Disponibilidad' },
        { key: 'objeciones', label: 'Objeciones' },
        { key: 'proximos_pasos', label: 'Próximos Pasos' },
        { key: 'sugerencias', label: 'Sugerencias' },
    ];

    // 1. Process template fields (maintains template order, uses labels from template)
    fields.forEach(f => {
        const normF = normalizeKey(f.name);
        // Skip place_visited variants
        if (normF === 'placevisited' || normF === 'lugarvisitado') return;

        const val = getFieldVal(f.name);
        // Find & mark the actual matched key so we don't double-render it later
        const matchedOrigKey = filledDataNormMap[normF] || f.name;
        renderedOrigKeys.add(matchedOrigKey);
        renderedOrigKeys.add(f.name);

        if (!isValMissing(val) && f.label && f.label.trim() !== '') {
            displayFields.push({ label: f.label, value: val });
        }
    });

    // 2. Smart sections — show if not already rendered by template fields
    smartSections.forEach(section => {
        const normSection = normalizeKey(section.key);
        const matchedOrigKey = filledDataNormMap[normSection];
        if (matchedOrigKey && renderedOrigKeys.has(matchedOrigKey)) return;

        const val = getFieldVal(section.key);
        if (!isValMissing(val)) {
            displayFields.push({ label: section.label, value: val });
            if (matchedOrigKey) renderedOrigKeys.add(matchedOrigKey);
            renderedOrigKeys.add(section.key);
        }
    });

    // 3. Catch-all: render any remaining filled_data keys not yet shown
    Object.entries(filledData).forEach(([key, val]) => {
        if (renderedOrigKeys.has(key)) return;
        if (isValMissing(val)) return;
        // Skip purely numeric or blank keys
        const derivedLabel = key.trim().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!derivedLabel.trim()) return;
        displayFields.push({ label: derivedLabel, value: val });
    });
    
    const hasAnything = !!placeVisited || displayFields.length > 0;
    const totalFilledKeys = Object.keys(filledData).filter(k => !isValMissing(filledData[k])).length;

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 -ml-2 gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al Panel
                    </Button>
                    <div className="flex items-center gap-2">
                        {isUpdated && (
                            <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100 hover:bg-blue-100 hover:shadow-blue-200 hover:scale-[1.04] transition-all duration-200 cursor-default select-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Actualizado
                            </Badge>
                        )}
                        {getStatusBadge(transcript.status)}
                    </div>
                </div>

                {/* Title Area */}
                <div className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
                        {title}
                    </h1>
                    <p className="text-gray-500 text-sm md:text-base flex items-center gap-2">
                        Informe creado por <span className="font-semibold text-gray-700">{authorName}</span> el {formattedDate}
                    </p>
                </div>

                {/* Content Layout */}
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Main Content Column */}
                    <div className="w-full lg:flex-1 space-y-8">
                        {/* Report Data Card */}
                        <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="bg-gray-50/50 border-b border-gray-100 px-6 py-5">
                                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    Datos del Informe
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-6">
                                    {/* Client / place row */}
                                    {placeVisited && (
                                        <div className="flex items-center gap-3 pb-5 border-b border-gray-100">
                                            <div className="w-9 h-9 rounded-full bg-brand-primary-50 flex items-center justify-center flex-shrink-0">
                                                <span className="text-brand-primary-600 text-base">📍</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Cliente visitado</p>
                                                <p className="text-gray-800 font-semibold text-[15px]">{placeVisitedDisplay}</p>
                                            </div>
                                        </div>
                                    )}
                                    {/* Template fields that have a real value */}
                                    {displayFields
                                        .filter(field => field.label && field.label.trim() !== '')
                                        .map((field: { label: string; value: any }, index: number) => (
                                        <div key={`${field.label}-${index}`}>
                                            <h3 className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                                                {field.label}
                                            </h3>
                                            <p className="text-gray-700 text-[15px] leading-relaxed whitespace-pre-wrap">
                                                {formatVal(field.value)}
                                            </p>
                                        </div>
                                    ))}
                                    {/* Debug info: show raw keys if template fields matched nothing */}
                                    {placeVisited && displayFields.length === 0 && totalFilledKeys > 1 && (
                                        <div className="mt-4 space-y-3">
                                            {Object.entries(filledData)
                                                .filter(([k]) => normalizeKey(k) !== 'placevisited' && normalizeKey(k) !== 'lugarvisitado')
                                                .filter(([, v]) => !isValMissing(v))
                                                .map(([key, val], idx) => (
                                                    <div key={idx}>
                                                        <h3 className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                                                            {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                        </h3>
                                                        <p className="text-gray-700 text-[15px] leading-relaxed whitespace-pre-wrap">
                                                            {Array.isArray(val) ? (val as any[]).join(', ') : String(val)}
                                                        </p>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    )}
                                    {/* Empty state */}
                                    {!hasAnything && (
                                        <div className="flex flex-col items-center py-6 text-center">
                                            <span className="text-3xl mb-2">📋</span>
                                            <p className="text-gray-500 text-sm">No se extrajeron datos estructurados de este informe.</p>
                                            <p className="text-gray-400 text-xs mt-1">Consulta la transcripción de audio para ver el contenido completo.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Audio Transcript Card */}
                        <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="bg-gray-50/50 border-b border-gray-100 px-6 py-5">
                                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Volume2 className="h-5 w-5 text-gray-500" />
                                    {isUpdated ? 'Transcripción Actualizada' : 'Transcripción de Audio'}
                                    {isUpdated && (
                                        <Badge className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100 hover:bg-blue-100 hover:shadow-blue-200 hover:scale-[1.04] transition-all duration-200 cursor-default select-none ml-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            Actualizado
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                {isUpdated ? (
                                    <>
                                        <p className="text-gray-600 text-[15px] leading-relaxed whitespace-pre-wrap">
                                            {transcript.modified_transcript}
                                        </p>
                                        <details className="mt-4">
                                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                                                Mostrar transcripción original
                                            </summary>
                                            <p className="mt-2 text-gray-400 text-sm leading-relaxed whitespace-pre-wrap border-l-2 border-gray-200 pl-3">
                                                {transcript.transcript || 'No hay transcripción original.'}
                                            </p>
                                        </details>
                                    </>
                                ) : (
                                    <p className="text-gray-600 text-[15px] leading-relaxed whitespace-pre-wrap">
                                        {transcript.transcript || 'No hay transcripción disponible.'}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar Column */}
                    <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
                        {/* Information Card */}
                        <Card className="border-gray-200 shadow-sm bg-white">
                            <CardHeader className="px-6 py-5 pb-2">
                                <CardTitle className="text-[17px] font-bold text-gray-800">
                                    Información
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-3 space-y-5">
                                <div className="flex items-start gap-3">
                                    <CalendarDays className="h-4 w-4 text-gray-400 mt-0.5" />
                                    <span className="text-sm text-gray-600">
                                        {formattedDate}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                        {transcript.audio_duration || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600 font-medium">
                                        {authorName}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                        {phoneNumber}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions Card */}
                        <Card className="border-gray-200 shadow-sm bg-white">
                            <CardHeader className="px-6 py-5 pb-2">
                                <CardTitle className="text-[17px] font-bold text-gray-800">
                                    Acciones
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-3 space-y-3">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2 h-11 text-gray-700 font-medium border-gray-200 hover:bg-gray-50"
                                    onClick={handleDownloadPDF}
                                    disabled={downloading}
                                >
                                    <Download className="h-4 w-4 text-gray-500" />
                                    {downloading ? 'Descargando...' : 'Descargar Informe'}
                                </Button>
                                <Button
                                    variant="outline"
                                    className={`w-full justify-start gap-2 h-11 font-medium border-gray-200 ${isPlaying ? 'bg-brand-primary-50 text-brand-primary-700 border-brand-primary-200' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    onClick={handlePlayAudio}
                                >
                                    {isPlaying ? (
                                        <Volume2 className="h-4 w-4 animate-pulse" />
                                    ) : (
                                        <Play className="h-4 w-4 text-gray-500" />
                                    )}
                                    {isPlaying ? 'Pausar Audio' : 'Reproducir Audio'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
