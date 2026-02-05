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
    const [messageBody, setMessageBody] = useState('Hello! This is a test message from your WhatsApp Business integration.');
    const [isTesting, setIsTesting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [lastTestResult, setLastTestResult] = useState<string | null>(null);

    const handleSendMessage = async () => {
        if (!testPhoneNumber) {
            toast.error('Please enter a phone number');
            return;
        }

        if (!testPhoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
            toast.error('Invalid phone number format. Use format (e.g., +2376209233)');
            return;
        }

        if (!messageBody.trim()) {
            toast.error('Please enter a message');
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
                setLastTestResult(`Message sent successfully! Message ID: ${result.messageId || 'N/A'}`);
                toast.success('Message sent successfully!');
            } else {
                setConnectionStatus('error');
                setLastTestResult('Failed to send message');
                toast.error('Failed to send message');
            }
        } catch (error: unknown) {
            setConnectionStatus('error');
            const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
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
                        <CardTitle className="text-xl">WhatsApp Integration</CardTitle>
                        <CardDescription className="mt-1">
                            Test and manage your WhatsApp Business API integration
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
