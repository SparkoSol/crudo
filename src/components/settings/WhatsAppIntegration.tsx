import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WhatsAppUtils } from '@/services/whatsappServices';
import toast from 'react-hot-toast';
import { MessageSquare, Send, CheckCircle2, XCircle, Loader2, Phone, Globe } from 'lucide-react';

export function WhatsAppIntegration() {
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastTestResult, setLastTestResult] = useState<string | null>(null);

  const handleTestConnection = async () => {
    if (!testPhoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!testPhoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      toast.error('Invalid phone number format. Use (e.g., +2376209233)');
      return;
    }

    setIsTesting(true);
    setConnectionStatus('idle');
    setLastTestResult(null);

    try {
      const success = await WhatsAppUtils.testConnection(testPhoneNumber);

      if (success) {
        setConnectionStatus('success');
        setLastTestResult('Test message sent successfully! Check your WhatsApp.');
        toast.success('WhatsApp test message sent successfully!');
      } else {
        setConnectionStatus('error');
        setLastTestResult('Failed to send test message');
        toast.error('Failed to send test message');
      }
    } catch (error: unknown) {
      setConnectionStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Failed to test WhatsApp connection';
      setLastTestResult(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!testPhoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    if (!testPhoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      toast.error('Invalid phone number format. Use format (e.g., +2376209233)');
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
          body: 'Hello! This is a test message from your WhatsApp Business integration.',
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
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Connection Status</span>
              </div>
              {connectionStatus === 'success' && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Connected</span>
                </div>
              )}
              {connectionStatus === 'error' && (
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Error</span>
                </div>
              )}
              {connectionStatus === 'idle' && (
                <div className="flex items-center gap-1 text-gray-400">
                  <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                  <span className="text-xs font-medium">Ready</span>
                </div>
              )}
            </div>
            {lastTestResult && (
              <div className={`text-sm mt-2 p-2 rounded ${connectionStatus === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : connectionStatus === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-gray-50 text-gray-700'
                }`}>
                {lastTestResult}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="test_phone" className="text-sm font-medium">
              Test Phone Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <Input
                id="test_phone"
                type="tel"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
                className="pl-10 h-11"
                placeholder="+2376209233"
                disabled={isTesting}
              />
            </div>
            <p className="text-xs text-gray-500">
              Enter a phone number in format (e.g., +2376209233) to test the integration
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={handleTestConnection}
              disabled={isTesting || !testPhoneNumber}
              className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Test Connection
                </>
              )}
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={isTesting || !testPhoneNumber}
              variant="outline"
              className="flex-1 gap-2 border-brand-primary-300 text-brand-primary-700 hover:bg-brand-primary-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Test Message
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
