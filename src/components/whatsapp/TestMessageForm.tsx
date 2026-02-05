import { Phone, Send, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface TestMessageFormProps {
    testPhoneNumber: string;
    setTestPhoneNumber: (val: string) => void;
    messageBody: string;
    setMessageBody: (val: string) => void;
    isTesting: boolean;
    onSendMessage: () => void;
}

export function TestMessageForm({
    testPhoneNumber,
    setTestPhoneNumber,
    messageBody,
    setMessageBody,
    isTesting,
    onSendMessage
}: TestMessageFormProps) {
    return (
        <div className="space-y-6">
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
                    onClick={onSendMessage}
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
    );
}
