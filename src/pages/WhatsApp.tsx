import { WhatsAppIntegration } from '@/components/whatsapp';

export default function WhatsApp() {
  return (
    <div className="p-6 lg:p-8 pt-20 lg:pt-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsApp Integration</h1>
        <p className="text-gray-600">
          Test and manage your WhatsApp Business API integration
        </p>
      </div>

      <WhatsAppIntegration />
    </div>
  );
}
