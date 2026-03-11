import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WhatsAppUtils } from '@/services/whatsappServices';
import toast from 'react-hot-toast';
import { MessageSquare } from 'lucide-react';
import { BusinessProfile } from './BusinessProfile';
import { ConnectionStatus } from './ConnectionStatus';
import { TestMessageForm } from './TestMessageForm';

export function WhatsAppIntegration() {
    const [testPhoneNumber, setTestPhoneNumber] = useState('');
    const [messageBody, setMessageBody] = useState('¡Hola! Este es un mensaje de prueba de tu integración de WhatsApp Business.');
    const [isTesting, setIsTesting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [lastTestResult, setLastTestResult] = useState<string | null>(null);

    const handleSendMessage = async () => {
        if (!testPhoneNumber) {
            toast.error('Por favor, introduce un número de teléfono');
            return;
        }

        if (!testPhoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
            toast.error('Formato de número de teléfono inválido. Usa el formato (ejemplo, +2376209233)');
            return;
        }

        if (!messageBody.trim()) {
            toast.error('Por favor, introduce un mensaje');
            return;
        }

        setIsTesting(true);
        setConnectionStatus('idle');
        setLastTestResult(null);

        try {
            const result = await WhatsAppUtils.sendMessage({
                messaging_product: 'whatsapp',
                to: testPhoneNumber,
                type: 'text',
                text: {
                    body: messageBody,
                },
            });

            if (result.success) {
                setConnectionStatus('success');
                setLastTestResult(`¡Mensaje enviado con éxito! ID del Mensaje: ${result.messageId || 'N/A'}`);
                toast.success('¡Mensaje enviado con éxito!');
            } else {
                setConnectionStatus('error');
                setLastTestResult('Error al enviar el mensaje');
                toast.error('Error al enviar el mensaje');
            }
        } catch (error: unknown) {
            setConnectionStatus('error');
            const errorMessage = error instanceof Error ? error.message : 'Error al enviar el mensaje';
            setLastTestResult(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                        <CardTitle className="text-xl">Integración de WhatsApp</CardTitle>
                        <CardDescription className="mt-1">
                            Prueba y gestiona tu integración de la API de WhatsApp Business
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <BusinessProfile />

                    <ConnectionStatus
                        status={connectionStatus}
                        lastTestResult={lastTestResult}
                    />

                    <TestMessageForm
                        testPhoneNumber={testPhoneNumber}
                        setTestPhoneNumber={setTestPhoneNumber}
                        messageBody={messageBody}
                        setMessageBody={setMessageBody}
                        isTesting={isTesting}
                        onSendMessage={handleSendMessage}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
