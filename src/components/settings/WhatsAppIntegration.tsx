import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WhatsAppUtils } from '@/services/whatsappServices';
import toast from 'react-hot-toast';
import { MessageSquare, Send, CheckCircle2, XCircle, Loader2, Phone, Globe, Building2, Clock, Smartphone, AlertCircle } from 'lucide-react';

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
      // Use text message type instead of template for custom messages
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
          {/* Business Profile Section */}
          <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-primary-600" />
              Business Profile
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Business Name</label>
                <div className="text-sm font-semibold text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                  We are Crudo
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Business Phone Number</label>
                <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                  <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-gray-400" />
                    +34643656593
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock className="h-3 w-3" />
                    Pending Review
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                <span className="font-semibold">Note:</span> Messaging will be fully enabled once the WhatsApp Business number is approved by Meta. Currently in sandbox/pending mode.
              </p>
            </div>
          </div>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div className="space-y-2">
              <Label htmlFor="message_body" className="text-sm font-medium">
                Message Body
              </Label>
              <Textarea
                id="message_body"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="h-24 resize-none"
                placeholder="Type your test message here..."
                disabled={isTesting}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={handleSendMessage}
              disabled={isTesting || !testPhoneNumber || !messageBody}
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
